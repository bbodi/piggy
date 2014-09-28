/// <reference path="bootstrap.d.ts" />
/// <reference path="knockout.d.ts" />
/// <reference path="knockout.mapping.d.ts" />
/// <reference path="common.ts" />
/// <reference path="locale_hu.ts" />

class TrekModel {

    itemToAdd: KnockoutObservable<string>;

    constructor(lang:string) {
        this.itemToAdd = ko.observable("");
    }

    showMenu(div_id: string) {
        $(".body_content").hide();
        $("#" + div_id).show();
    }

    addItem() {

    }

    removeItem() {

    }

    sortItems() {

    }

    getIndex() {

    }

    setIndex() {

    }

}

// You have to extend knockout for your own handlers
interface KnockoutBindingHandlers {
    numericText: KnockoutBindingHandler;
    dateText: KnockoutBindingHandler;
    datePicker: KnockoutBindingHandler;
}

var Model;

$(document).ready(function () {
    $(".body_content").hide();
    Model = new TrekModel("hu");
    ko.applyBindings(Model);
});