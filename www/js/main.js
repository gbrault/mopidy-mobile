angular.module('mopidy-mobile', [
  'ionic',
  'mopidy-mobile.connection',
  'mopidy-mobile.coverart',
  'mopidy-mobile.coverartarchive',
  'mopidy-mobile.lastfm',
  'mopidy-mobile.library',
  'mopidy-mobile.playback',
  'mopidy-mobile.playlists',
  'mopidy-mobile.settings',
  'mopidy-mobile.tracklist',
  'mopidy-mobile.util',
  'mopidy-mobile.ui'
])

.config(function($ionicConfigProvider) {
  // TODO: platform defaults/configurable?
  $ionicConfigProvider.tabs.position('bottom');
  $ionicConfigProvider.tabs.style('standard');
})

.config(function($provide) {
  $provide.decorator('connectionErrorHandler', function($delegate, $filter, $ionicPopup) {
    var translate = $filter('translate');
    var reset = false;

    return function(error, connection, callback) {
      try {
        $delegate.apply($delegate, arguments);
      } catch (e) {
        // default handler throws error
      }

      var options = {
        title: error.name || translate('Error'),
        subTitle: error.message || '',
        buttons: [{
          text: translate('Ignore'),
          type: 'button-assertive',
          onTap: function() { return false; }
        }, {
          text: translate('Retry'),
          type: 'button-positive',
          onTap: function() { return true; }
        }]
      };
      if (error.data && error.data.message) {
        options.template = '<pre>' + error.data.message + '</pre>';
      }
      return $ionicPopup.show(options).then(function(retry) {
        if (!retry) {
          throw error;
        }
        if (reset) {
          connection.reset();
        } else {
          reset = true;
        }
        return connection(callback, true).finally(function() {
          reset = false;
        });
      });
    };
  });
})

.config(function($stateProvider) {
  $stateProvider.state('main', {
    abstract: true,
    url: '',
    controller: 'MainCtrl',
    templateUrl: 'templates/main.html'
  });
})

.config(function($urlRouterProvider, util) {
  if (util.data(document.documentElement, 'webSocketUrl') !== undefined) {
    $urlRouterProvider.otherwise('/playback');
  } else {
    $urlRouterProvider.otherwise('/settings');
  }
})

.config(function(connectionProvider, util) {
  connectionProvider.loadingOptions({
    delay: 100,
    duration: 10000
  });
  connectionProvider.settings({
    backoffDelayMax: 2000,
    backoffDelayMin: 500,
    webSocketUrl: util.data(document.documentElement, 'webSocketUrl')
  });
})

.config(function(coverartProvider) {
  coverartProvider.maxCache(100);
})

.config(function(storageProvider, stylesheetProvider, util) {
  storageProvider.prefix('mopidy-mobile');
  storageProvider.defaults(angular.extend({
    action: 'play',
    coverart: {connection: true},
    locale: '',  // default/browser locale
    stylesheet: stylesheetProvider.get()
  }, util.data(document.documentElement)));
})

.controller('MainCtrl', function($ionicPlatform, $log, $q, $rootElement, $scope, $window) {
  $ionicPlatform.ready().then(function() {
    return $q(function(resolve) {
      if ($window.cordova && $window.cordova.getAppVersion) {
        $window.cordova.getAppVersion(function(version) {
          resolve(version);
        });
      } else {
        resolve($rootElement.attr('data-version'));
      }
    }).then(function(version) {
      $log.info('Mopidy Mobile ' + version + ' (' + ionic.Platform.platform() + ')');
      $scope.appVersion = version;
    });
  });

  // TODO: get from CSS, image size = device size?
  // TODO: other globals?
  angular.extend($scope, {
    thumbnailWidth: 64,
    thumbnailHeight: 64
  });
})

.run(function($log, coverart, locale, storage, stylesheet) {
  if (storage.get('theme')) {
    $log.warn('Clearing local settings, sorry for the inconvenience...');
    storage.clear();  // clear deprecated settings
  }
  stylesheet.set(storage.get('stylesheet'));
  locale.set(storage.get('locale'));
  angular.forEach(storage.get('coverart'), function(enabled, service) {
    if (enabled) {
      coverart.enable(service);
    }
  });
})
;
