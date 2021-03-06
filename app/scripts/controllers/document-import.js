(function () {
  'use strict';

  angular
    .module('lorryApp')
    .controller('DocumentImportCtrl', DocumentImportCtrl);

  DocumentImportCtrl.$inject = ['$scope', '$location', 'lodash', 'ngDialog', 'PMXConverter', 'analyticsService'];

  function DocumentImportCtrl($scope, $location, lodash, ngDialog, PMXConverter, analyticsService) {
    var self = this;

    $scope.dialogOptions = {};

    $scope.showImportDialog = function (tab) {
      $scope.setDialogTab(tab);
      $scope.dialog = ngDialog.open({
        template: '/views/import-dialog.html',
        className: 'ngdialog-theme-lorry',
        showClose: false,
        scope: $scope
      });
    };

    $scope.tabStyleClasses = function (tab) {
      return $scope.dialogOptions.dialogTab === tab ? 'button-tab-selected' : 'button-tab-deselected';
    };

    $scope.setDialogTab = function (tab) {
      $scope.importFileName = null;
      $scope.docImport = {};
      $scope.dialogOptions.dialogTab = tab;
      $scope.setDialogPane(tab === 'compose' ? 'upload' : 'pmx-upload');
    };

    $scope.setDialogPane = function (pane) {
      $scope.dialogOptions.dialogPane = pane;
    };

    $scope.disableImport = function () {
      // if on the paste pane without content OR
      //    on the file upload pane with no file selected
      return !!((lodash.endsWith($scope.dialogOptions.dialogPane, 'paste') && lodash.isEmpty($scope.docImport.raw)) ||
      (lodash.endsWith($scope.dialogOptions.dialogPane, 'upload') && lodash.isEmpty($scope.importFileName)));
    };

    $scope.dialogPaneLinkClasses = function (paneLink) {
      if (paneLink === $scope.dialogOptions.dialogPane) {
        return 'current';
      }
    };

    $scope.importYaml = function(docImport) {
      $scope.setNewSession();
      $scope.setLoading(true);
      if (lodash.endsWith($scope.dialogOptions.dialogPane, 'paste')) {
        if (docImport && !lodash.isEmpty(docImport.raw)) {
          self.importPastedContent(docImport.raw);
        }
      } else {
        if ($scope.files) {
          $scope.upload();
        }
      }
      $scope.dialog.close();
    };

    this.importPastedContent = function (content) {
      var trackEventAction;

      try {
        if ($scope.dialogOptions.dialogTab === 'pmx') {
            trackEventAction = 'PMX';
            $scope.yamlDocument.raw = PMXConverter.convert(content);
        } else {
          trackEventAction = 'docker-compose.yml';
          // remove blank and comment lines
          $scope.yamlDocument.raw = $scope.removeBlankAndCommentLinesFromYaml(content);
        }
      } catch (error) {
        self.handleImportError(error);
      } finally {
        // GA click tracking
        analyticsService.trackEvent('create', trackEventAction, 'via paste');
      }
    };

    $scope.upload = function() {
      var fr = new FileReader();
      var trackEventAction;

      fr.addEventListener('load', function(e) {
        $scope.$apply(function(){
          try {
            if ($scope.dialogOptions.dialogTab === 'pmx') {
              trackEventAction = 'PMX';
              $scope.yamlDocument.raw = PMXConverter.convert(e.target.result);
            } else {
              trackEventAction = 'docker-compose.yml';
              $scope.yamlDocument.raw = $scope.removeBlankAndCommentLinesFromYaml(e.target.result);
            }
          } catch (error) {
            self.handleImportError(error);
          } finally {
            // GA click tracking
            analyticsService.trackEvent('create', trackEventAction, 'via upload');
          }
        });
      });
      fr.readAsText($scope.files[0]);
    };

    this.handleImportError = function (error) {
      $scope.setLoading(false);
      $scope.yamlDocument.errors = [{error: {message: error}}];
      $scope.yamlDocument.loadFailure = true;
    };

    this.initialize = function () {
      if(angular.isDefined($scope.startImport)) {
        $scope.showImportDialog($scope.startImport);
        $location.search({});
      }
    };

    self.initialize();
  }
})();
