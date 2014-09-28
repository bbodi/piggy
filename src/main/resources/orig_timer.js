var TimePeriod = function(dur, type) {
    this.fromHour = ko.observable();
    this.fromMinute = ko.observable();
    this.duration = ko.observable(dur);
    this.type = ko.observable(type);
    this.comment = ko.observable();

    this.fromTimeStr = ko.computed(function () {
        return this.fromHour() + ":" + this.fromMinute();
    }, this);

    this.setFields = function(date) {
        this.fromHour(date.getHours());
        this.fromMinute(date.getMinutes());
    }
};

var Config = function() {
    this.timePeriods = ko.observableArray([]);
};

var Day = function(config) {
    this.dayOfYear = ko.observable();
    var arr = [];
    config.timePeriods().forEach(function(period) {
        arr.push(period);
    });
    this.timePeriods = ko.observableArray(arr);
    this.setFields = function(date) {
        var date = date;
        this.timePeriods().forEach(function(period) {
            period.setFields(date);
            date = new Date(date.getTime() + (period.duration() * 60 * 1000));
        });
    }
};

var Timer = function(config) {
    this.today = ko.observable(new Day(config));
    this.today().setFields(new Date());
    this.config = ko.observable(config);

    this.selectedWeek = ko.observable(0);
    this.currentWeek = ko.observable(30);

    this.running = ko.observable(false);

    var self = this;

    this.currentTimerPeriodIndex = ko.observable(0);

    this.onPeriodEnd = function() {
        self.running(false);
        this.activePeriod(null);
        if (self.currentTimerPeriodIndex() + 1 >= this.today().timePeriods().length) {
            alert("Gratulálok, vége! ;) ");
        } else {
            self.currentTimerPeriodIndex(self.currentTimerPeriodIndex()+1);
            var nextPeriod = this.today().timePeriods()[self.currentTimerPeriodIndex()];
            alert("Indulhat a következő? " + nextPeriod.duration() + " perc " + nextPeriod.type());
            self.start();
        }
    };

    this.callback = function() {
        var elapsedSecs = (new Date().getTime() - self.startTime()) / 1000.0;
        self.elapsedSecs(elapsedSecs);
        if (self.remaindingSecs() <= 0) {
           self.onPeriodEnd();
           return;
        }
        setTimeout(function(){
            if (self.running() == false) {
                return;
            }
            self.callback();
        }, 1000);
    };

    this.start = function() {
        this.running(true);
        this.activePeriod(this.today().timePeriods()[self.currentTimerPeriodIndex()]);
        var nowDate = new Date();
        var now = nowDate.getTime();
        this.startTime(now);
        this.activePeriod().setFields(nowDate);

        self.callback();
    };

    this.weekNames = ko.computed(function () {
        return ["30", "31", "32", "33", "34"];
    }, this);


    this.days = function() {
        return [new Day(config), new Day(config), new Day(config)];
    };

    this.activePeriod = ko.observable(null);

    this.startTime = ko.observable();
    this.elapsedSecs = ko.observable();
    this.remaindingSecs = ko.computed(function () {
        if (!this.activePeriod()) {
            return 0;
        }
        return Math.floor((this.activePeriod().duration()*60 - this.elapsedSecs()));
    }, this);
    this.currentPeriodTimerPercent = ko.computed(function () {
        if (!this.activePeriod()) {
            return 0;
        }

        var maxSecs = this.activePeriod().duration() * 60;
        return (100 - (this.elapsedSecs() / maxSecs * 100)) + '%';
    }, this);
};


var Model;
function initView() {

    ko.bindingHandlers.numericText = {
        update: function (element, valueAccessor, allBindingsAccessor) {
            var value = ko.utils.unwrapObservable(valueAccessor());
            var formattedValue = numberWithCommas(value);

            ko.bindingHandlers.text.update(element, function () {
                return formattedValue;
            });
        },
        defaultPrecision: 1
    };

    ko.bindingHandlers.dateText = {
        update: function (element, valueAccessor, allBindingsAccessor) {
            var date = ko.utils.unwrapObservable(valueAccessor());
            var formattedValue = toDateStr(date);

            ko.bindingHandlers.text.update(element, function () {
                return formattedValue;
            });
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
}
