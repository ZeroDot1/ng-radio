import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { PlayerService } from 'src/app/services/player.service';
import { SleepTimerService } from 'src/app/services/sleep-timer.service';
import { KeepAwakeService } from 'src/app/services/keep-awake.service';
import { Utils } from 'src/app/utils/utils';
import { NotificationService, Severities } from 'src/app/services/notification.service';
import { Subscription, merge } from 'rxjs';
import { delay } from 'rxjs/operators';

@Component({
  selector: 'blr-player-bar',
  templateUrl: './player-bar.component.html',
  styleUrls: ['./player-bar.component.scss']
})
export class PlayerBarComponent implements OnInit, OnDestroy {
  constructor(public playerService: PlayerService,
    public sleepTimerService: SleepTimerService,
    public keepAwakeService: KeepAwakeService,
    private notificationService: NotificationService,
    private changeDetectorRef: ChangeDetectorRef,
    private router: Router) {}

  private changeDetectionSubscription: Subscription;

  public ngOnInit() {
    // When the play / pause state or the now playing info canged
    this.changeDetectionSubscription = merge(
      this.playerService.nowPlaying$,
      this.playerService.paused
    )
    /* Delay for 0ms to wait for the async
    pipe bindings to catch up. */
    .pipe(delay(0))
    .subscribe(() => this.changeDetectorRef.detectChanges());
  }

  ngOnDestroy() {
    if (this.changeDetectionSubscription) { this.changeDetectionSubscription.unsubscribe(); }
  }

  public onImgError(img: HTMLImageElement) {
    Utils.SetAltImage(img, '/assets/images/radio.svg');
  }

  public onTimerSelected(length: number) {
    if (length != null) {
      this.sleepTimerService.setTimer(length);
    } else {
      this.sleepTimerService.cancelTimer();
    }
  }

  public onNowPlayingClicked(): void {
    /* When the user clicks on the now playing info in the player bar,
    take them to the now-playing component if they're not already
    there. */
    if (this.router.url !== '/now-playing') {
      console.log('navigating');
      this.router.navigate(['/now-playing']);
    }
  }

  public onAddToFavoritesClicked(): void {
    this.notificationService.notify(Severities.Info, 'Coming Soon', 'Favorites functionality coming soon!');
  }
}
