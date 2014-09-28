var Locale = function () {
    Locale.get = function (lang) {
        if (lang == 'hu') {
            return new Locale_hu();
        }
    };
};

var Locale_hu = function () {
    this.monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
};