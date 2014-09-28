/// <reference path="knockout.d.ts" />
/// <reference path="knockout.mapping.d.ts" />
/// <reference path="common.ts" />
var Item = (function () {
    function Item(text) {
        this.text = ko.observable(text);
        this.completed = ko.observable(false);
    }
    return Item;
})();

var TimePeriod = (function () {
    function TimePeriod(dur, periodType) {
        this.dur = dur;
        this.periodType = periodType;
        this.fromHour = ko.observable(0);
        this.fromMinute = ko.observable(0);
        this.duration = ko.observable(dur);
        this.type = ko.observable(periodType);
        this.items = ko.observableArray([]);
        this.itemToAdd = ko.observable("");
        this.fromTimeStr = ko.computed(function () {
            return this.fromHour() + ":" + this.fromMinute();
        }, this);
    }
    TimePeriod.prototype.addItem = function () {
        this.items.push(new Item(this.itemToAdd()));
    };

    TimePeriod.prototype.setFields = function (date) {
        this.fromHour(date.getHours());
        this.fromMinute(date.getMinutes());
    };
    return TimePeriod;
})();

var Config = (function () {
    function Config() {
        this.timePeriods = ko.observableArray([]);
    }
    return Config;
})();

var Day = (function () {
    function Day(config) {
        this.dayOfYear = ko.observable();
        var arr = [];
        config.timePeriods().forEach(function (period) {
            arr.push(period);
        });
        this.timePeriods = ko.observableArray(arr);
    }
    Day.prototype.setFields = function (date) {
        var date = date;
        this.timePeriods().forEach(function (period) {
            period.setFields(date);
            date = new Date(date.getTime() + (period.duration() * 60 * 1000));
        });
    };
    return Day;
})();

var Timer = (function () {
    function Timer(config) {
        this.today = ko.observable(new Day(config));
        this.today().setFields(new Date());
        this.config = ko.observable(config);
        this.selectedWeek = ko.observable(0);
        this.currentWeek = ko.observable(30);
        this.running = ko.observable(false);
        this.currentTimerPeriodIndex = ko.observable(0);

        this.startTime = ko.observable(0);
        this.elapsedSecs = ko.observable(0);

        this.elapsedMinutes = ko.computed(function () {
            return Math.floor(this.elapsedSecs() / 60.0);
        }, this);

        this.weekNames = ko.computed(function () {
            return ["30", "31", "32", "33", "34"];
        }, this);

        this.days = ko.computed(function () {
            return [new Day(config), new Day(config), new Day(config)];
        }, this);

        this.activePeriod = ko.computed(function () {
            if (isNaN(this.currentTimerPeriodIndex())) {
                return null;
            }
            return this.today().timePeriods()[this.currentTimerPeriodIndex()];
        }, this);

        this.remaindingSecs = ko.computed(function () {
            if (this.activePeriod() == null) {
                return 0;
            }
            return Math.floor((this.activePeriod().duration() * 60 - this.elapsedSecs()));
        }, this);

        this.currentPeriodTimerPercentValue = ko.computed(function () {
            if (!this.activePeriod()) {
                return 0;
            }
            var maxSecs = this.activePeriod().duration() * 60;
            return (100 - (this.elapsedSecs() / maxSecs * 100));
        }, this);

        this.currentPeriodTimerPercent = ko.computed(function () {
            return this.currentPeriodTimerPercentValue() + "%";
        }, this);
    }
    Timer.prototype.clickPeriod = function (index) {
        this.currentTimerPeriodIndex(index);
        this.running(false);
    };

    Timer.prototype.onPeriodEnd = function () {
        this.running(false);
        if (this.currentTimerPeriodIndex() + 1 >= this.today().timePeriods().length) {
            alert("Gratulálok, vége! ;) ");
        } else {
            this.currentTimerPeriodIndex(this.currentTimerPeriodIndex() + 1);
            var nextPeriod = this.today().timePeriods()[this.currentTimerPeriodIndex()];
            alert("Indulhat a következő? " + nextPeriod.duration() + " perc " + nextPeriod.type());
            this.start();
        }
    };

    Timer.prototype.callback = function () {
        var _this = this;
        var elapsedSecs = (new Date().getTime() - this.startTime()) / 1000.0;
        this.elapsedSecs(elapsedSecs);
        document.title = this.remaindingSecs().toString();

        window.localStorage.setItem("elapsedSecs", this.elapsedSecs().toString());
        window.localStorage.setItem("running", this.running().toString());
        window.localStorage.setItem("currentTimerPeriodIndex", this.currentTimerPeriodIndex().toString());

        if (this.remaindingSecs() <= 0) {
            this.onPeriodEnd();
            return;
        }
        setTimeout(function () {
            if (_this.running() == false) {
                return;
            }
            _this.callback();
        }, 1000);
    };

    Timer.prototype.start = function () {
        this.elapsedSecs(0);
        this.running(true);
        var nowDate = new Date();
        var now = nowDate.getTime();
        this.startTime(now);
        this.activePeriod().setFields(nowDate);

        this.callback();
    };

    Timer.prototype.startFromLocalStorage = function () {
        var savedCurrentPeriodIndex = parseInt(window.localStorage.getItem("currentTimerPeriodIndex"));
        if (!isNaN(savedCurrentPeriodIndex)) {
            this.currentTimerPeriodIndex(savedCurrentPeriodIndex);
            var asd = window.localStorage.getItem("running");
            this.running(window.localStorage.getItem("running") == "true");
            this.elapsedSecs(parseInt(window.localStorage.getItem("elapsedSecs")));
            var now = new Date().getTime();
            this.startTime(now - this.elapsedSecs() * 1000);
            this.activePeriod().setFields(new Date(this.startTime()));
            this.callback();
        }
    };
    return Timer;
})();


var Model;
function initView() {
    ko.bindingHandlers.numericText = {
        update: function (element, valueAccessor, allBindingsAccessor) {
            var value = ko.utils.unwrapObservable(valueAccessor());
            var formattedValue = numberWithCommas(value);

            ko.bindingHandlers.text.update(element, function () {
                return formattedValue;
            }, null, null, null);
        },
        defaultPrecision: 1
    };

    ko.bindingHandlers.dateText = {
        update: function (element, valueAccessor, allBindingsAccessor) {
            var date = ko.utils.unwrapObservable(valueAccessor());
            var formattedValue = toDateStr(date);

            ko.bindingHandlers.text.update(element, function () {
                return formattedValue;
            }, null, null, null);
        },
        defaultPrecision: 1
    };

    ko.bindingHandlers.datePicker = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            ko.utils.registerEventHandler(element, "change", function () {
                var value = valueAccessor();
                value(new Date(element.value));
            });
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var value = valueAccessor();
            var asd = ko.utils.unwrapObservable(valueAccessor());
            element.value = value().toISOString();
        }
    };

    var config = new Config();
    config.timePeriods.push(new TimePeriod(20, "F"));
    config.timePeriods.push(new TimePeriod(120, "W"));
    config.timePeriods.push(new TimePeriod(20, "F"));
    config.timePeriods.push(new TimePeriod(90, "W"));
    config.timePeriods.push(new TimePeriod(20, "F"));
    config.timePeriods.push(new TimePeriod(90, "W"));
    config.timePeriods.push(new TimePeriod(120, "F"));

    Model = new Timer(config);
    ko.applyBindings(Model);

    Model.startFromLocalStorage();
}
//# sourceMappingURL=timer.js.map
