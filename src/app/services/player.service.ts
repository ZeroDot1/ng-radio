import { Injectable, Inject, ApplicationRef } from '@angular/core';
import { Station } from '../models/station';
import { NowPlaying } from '../models/now-playing';
import { MetadataService } from './metadata.service';
import { interval, Subscription, BehaviorSubject } from 'rxjs';
import { Title } from '@angular/platform-browser';
import { ConfigService } from './config.service';
import { NotificationService, Severities } from './notification.service';
import { Metadata } from '../models/metadata';
import { cloneDeep, isEqual } from 'lodash';
import { SleepTimerService } from './sleep-timer.service';
import { AudioElementToken } from '../injection-tokens/audio-element-token';
import { AudioElement } from '../models/audio-element';
import { LoggingService } from './logging.service';
import isBlank from 'is-blank';

@Injectable({providedIn: 'root'})
export class PlayerService {
  constructor(private metadataService: MetadataService,
    private notificationService: NotificationService,
    private sleepTimerService: SleepTimerService,
    private loggingService: LoggingService,
    private configService: ConfigService,
    private titleService: Title,
    private applicationRef: ApplicationRef,
    @Inject(AudioElementToken) private audio: AudioElement) {
      this.audio.error.subscribe(error => this.onAudioError(error));
      this.audio.playing.subscribe(() => this.onAudioPlaying());
      this.audio.paused.subscribe(() => this.onAudioPaused());
      // Pause the playing audio when the sleep timer does its thing
      this.sleepTimerService.sleep.subscribe(() => this.pause());
    }

  private refreshSub: Subscription;
  private metaFetchSub: Subscription;
  private nowPlaying = new NowPlaying();
  public nowPlaying$ = new BehaviorSubject<NowPlaying>(this.nowPlaying);
  private _paused = new BehaviorSubject<boolean>(true);
  public paused = this._paused.asObservable();

  /** Notifies the user and logs the event when the audio fails to play */
  private onAudioError(error): void {
    this.loggingService.logException(error, {'event': 'Failed to play audio', 'source': this.audio.source });
    this.notificationService.notify(Severities.Error, 'Failed to play audio', `Failed to play ${this.audio.source}`);
  }

  /** Updates the reactive 'paused' state and triggers change
  detection when the audio starts to play. */
  private onAudioPlaying(): void {
    /* Notify anybody listening to changes on the 'paused'
    state that the audio is no longer paused. */
    this._paused.next(false);
    /* Explicitly trigger application-wide change detection
    because this is a change that we do want represented in
    template bindings and change detection won't automatically
    be triggered because the source DOM event happened outside
    of Angular's zone. */
    this.applicationRef.tick();
  }

  /** Updates the reactive 'paused' state, triggers change detection,
   * and unsubscribes from any metadata fetch & refresh
   * subscriptions. */
  private onAudioPaused(): void {
    /* Notify anybody listening to changes on the 'paused'
    state that the audio is now paused. */
    this._paused.next(true);
    /* Explicitly trigger application-wide change detection
    because this is a change that we do want represented in
    template bindings and change detection won't automatically
    be triggered because the source DOM event happened outside
    of Angular's zone. */
    this.applicationRef.tick();
    /* Unsubscribe from the refresh interval and from any concurrent metadata
    fetch when the media is paused.  We want to do this in the onAudioPaused
    handler so that we catch the "user presses the browser-provided pause button"
    use-case as well, in addition to our own pause button. */
    if (this.refreshSub) { this.refreshSub.unsubscribe(); }
    if (this.metaFetchSub) { this.metaFetchSub.unsubscribe(); }
  }

  /** Reports whether there is a currently selected station */
  public get stationSelected(): boolean {
    return !isBlank(this.audio.source);
  }

  /** Plays the specified Station */
  public playStation(station: Station) {
    // Pause the current audio in case it's already playing something
    this.pause();
    // Update the current station
    this.updateStation(station);
    // Assign the new station URL
    this.audio.source = station.url;
    // Play the audio and fetch the metadata
    this.play();
  }

  /** Updates the Now Playing metadata with the specified station info */
  private updateStation(station: Station) {
    this.nowPlaying.station = station.title;
    this.nowPlaying.genre = station.genre;
    this.nowPlaying.iconUrl = station.iconUrl;
    this.nowPlaying.tags = station.tags;
    // Notify listeners of the station change
    this.nowPlaying$.next(this.nowPlaying);
  }

  /** Initiates a new subscription to getMetadata and updates the stored 'now playing'
   * info accordingly upon succesful metadata retrieval. */
  private loadMetadata(setLoadingTitle: boolean = false) {
    if (setLoadingTitle) {
      this.nowPlaying.title = 'Loading Metadata...';
      this.nowPlaying$.next(this.nowPlaying);
    }
    // If we're not still waiting on a previous metadata fetch to complete
    if (this.metaFetchSub == null || this.metaFetchSub.closed) {
      // Fetch updated metadata from the API
      this.metaFetchSub = this.metadataService.getMetadata(this.audio.source)
        .subscribe(
          meta => {
            // Update the "Now Playing" model with the retrieved metadata
            this.updateMetadata(meta);
            /* Set the HTML document title to the title (or station,
              if no title was provided). */
            if (!isBlank(this.nowPlaying.title)) {
              this.titleService.setTitle(this.nowPlaying.title);
            } else {
              this.titleService.setTitle(this.nowPlaying.station);
            }
          },
          error => {
            /* In the case of error, gracefully set the title to
            "Metadata Unavilable" */
            this.loggingService.logException(error, {'event': 'Failed to fetch metadata', 'url': this.audio.source });
            this.nowPlaying.title = 'Metadata Unavailable';
            this.titleService.setTitle(this.nowPlaying.title);
            this.nowPlaying$.next(this.nowPlaying);
          }
        );
    }
  }

  public play() {
    // Play the audio
    this.audio.play();
    /* On the initial load of the station, load the metadata
    and set the title to "Loading..." until it gets here. */
    this.loadMetadata(true);
    /* Unsubscribe if there's still an active refresh interval
    subscription from the previously-played station. */
    if (this.refreshSub) { this.refreshSub.unsubscribe(); }
    // Refresh the "Now Playing" metadata once every few seconds.
    this.refreshSub = interval(this.configService.appConfig.metadataRefreshInterval).subscribe(() => this.loadMetadata());
  }

  public pause() {
    this.audio.pause();
  }

  private updateMetadata(metadata: Metadata) {
    const beforeChange = cloneDeep(this.nowPlaying);
    this.nowPlaying.title = metadata.title;
    this.nowPlaying.bitrate = metadata.bitrate;
    /* If we don't already have a stored station title and one
    was provided in the metadata, then use the metadata version. */
    if (this.nowPlaying.station == null && metadata.stationTitle != null) {
        this.nowPlaying.station = metadata.stationTitle;
    }
    /* Similarly, assign genre if it was returned in
    the metadata and doesn't already exist. */
    if (this.nowPlaying.genre == null && metadata.genre != null) {
        this.nowPlaying.genre = metadata.genre;
    }
    /* If anything changed, then notify listeners. */
    if (!isEqual(beforeChange, this.nowPlaying)) {
      this.nowPlaying$.next(this.nowPlaying);
    }
  }
}
