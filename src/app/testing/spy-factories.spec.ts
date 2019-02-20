import { Subject } from 'rxjs';
import { NowPlaying } from '../models/now-playing';

export class SpyFactories {
  public static CreateConfigServiceSpy(): any {
    const spy = jasmine.createSpyObj('configService', ['initialize']);
    spy['appConfig'] = {
      'metadataApiUrl': 'test.com',
      'radioBrowserApiUrl': 'test.com',
      'metadataRefreshInterval': 0,
      'metadataFetchTimeout': 0
    };
    spy['initialized'] = true;
    return spy;
  }
  public static CreateErrorHandlingServiceSpy(): any {
    const spy = jasmine.createSpyObj('errorHandlingService', ['handleError']);
    return spy;
  }

  public static CreatePlayerServiceSpy(): any {
    const spy = jasmine.createSpyObj('playerService', ['playStation']);
    spy['nowPlaying$'] = new Subject<NowPlaying>();
    return spy;
  }

  public static CreateMetadataServiceSpy(): any {
    const spy = jasmine.createSpyObj('metadataService', ['getMetadata']);
    return spy;
  }

  public static CreateRadioBrowserServiceSpy(): any {
    const spy = jasmine.createSpyObj('radioBrowser', ['searchStations']);
    return spy;
  }
}