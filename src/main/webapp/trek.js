/// <reference path="bootstrap.d.ts" />
/// <reference path="knockout.d.ts" />
/// <reference path="knockout.mapping.d.ts" />
/// <reference path="common.ts" />
/// <reference path="locale_hu.ts" />
var TrekModel = (function () {
    function TrekModel(lang) {
        this.itemToAdd = ko.observable("");
    }
    TrekModel.prototype.showMenu = function (div_id) {
        $(".body_content").hide();
        $("#" + div_id).show();
    };

    TrekModel.prototype.addItem = function () {
    };

    TrekModel.prototype.removeItem = function () {
    };

    TrekModel.prototype.sortItems = function () {
    };

    TrekModel.prototype.getIndex = function () {
    };

    TrekModel.prototype.setIndex = function () {
    };
    return TrekModel;
})();


var Model;

$(document).ready(function () {
    $(".body_content").hide();
    Model = new TrekModel("hu");
    ko.applyBindings(Model);
});
//# sourceMappingURL=trek.js.map
