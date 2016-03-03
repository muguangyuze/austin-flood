
exports.home = function(req, res) {
    var currentUser = Parse.User.current();
    var user = null;
    if (currentUser) {
        currentUser.fetch().then(function(fetchedUser){
            user = {};
            user['username'] = fetchedUser.getUsername();
            res.render('home', {user: user})
        }, function(error){
            console.error(error);
        });
    }
    else {
        res.render('home', {user: null});
    }

};

exports.login = function(req, res) {
    var currentUser = Parse.User.current();
    if (currentUser) {
        res.redirect("/");
    }
    else {
        res.render('login');
    }
};

exports.loginSubmit = function(req, res) {
    Parse.User.logIn(req.body.username,req.body.password).then(function() {
            // Login succeeded, redirect to homepage.
            // parseExpressCookieSession will automatically set cookie.
            res.redirect("/");
        },
        function(error) {
            // Login failed, redirect back to login form.
            res.redirect("/login");
        });
};

exports.signup = function(req, res) {
    var currentUser = Parse.User.current();
    if (currentUser) {
        res.redirect("/");
    }
    else {
        res.render('signup');
    }
};

exports.signupSubmit = function(req, res) {
    Parse.User.signUp(req.body.username,req.body.password, {'email': req.body.email,'phone': req.body.phone}).then(function() {
            Parse.User.logOut();
            res.redirect("/login");
        },
        function(error) {
            res.redirect("/signup");
        });
};

exports.logout = function(req, res) {
    Parse.User.logOut();
    res.redirect('/');
};
exports.test = function(req, res) {
    var currentUser = Parse.User.current();
    if (currentUser) {
        res.render('test');
    }
    else {
        res.render('test');
    }
}
