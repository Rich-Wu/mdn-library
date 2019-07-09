var BookInstance = require('../models/bookInstance');
var Book = require('../models/book');
var async = require('async');
const { body,validationResult } = require('express-validator');
const { sanitizeBody } = require('express-validator');

// Display list of all BookInstances.
exports.bookinstance_list = function(req, res, next) {
  BookInstance.find()
    .populate('book')
    .exec(function (err, list_bookinstances) {
      if (err) { return next(err); }
      // Successful, so render
      res.render('bookinstance_list', { title: 'Book Instance List', bookinstance_list: list_bookinstances });
    });  
};

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = function(req, res, next) {

  BookInstance.findById(req.params.id)
  .populate('book')
  .exec(function (err, bookinstance) {
    if (err) { return next(err); }
    if (bookinstance==null) { // No results.
        var err = new Error('Book copy not found');
        err.status = 404;
        return next(err);
      }
    // Successful, so render.
    res.render('bookinstance_detail', { title: 'Copy: '+bookinstance.book.title, bookinstance:  bookinstance});
  })

};

// Display BookInstance create form on GET.
exports.bookinstance_create_get = function(req, res, next) {       

  Book.find({},'title')
  .exec(function (err, books) {
    if (err) { return next(err); }
    // Successful, so render.
    res.render('bookinstance_form', {title: 'Create BookInstance', book_list: books});
  });
  
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [

  // Validate fields.
  body('book', 'Book must be specified').isLength({ min: 1 }).trim(),
  body('imprint', 'Imprint must be specified').isLength({ min: 1 }).trim(),
  body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601(),
  
  // Sanitize fields.
  sanitizeBody('book').escape(),
  sanitizeBody('imprint').escape(),
  sanitizeBody('status').trim().escape(),
  sanitizeBody('due_back').toDate(),
  
  // Process request after validation and sanitization.
  (req, res, next) => {

      // Extract the validation errors from a request.
      const errors = validationResult(req);

      // Create a BookInstance object with escaped and trimmed data.
      var bookinstance = new BookInstance(
        { book: req.body.book,
          imprint: req.body.imprint,
          status: req.body.status,
          due_back: req.body.due_back
         });

      if (!errors.isEmpty()) {
          // There are errors. Render form again with sanitized values and error messages.
          Book.find({},'title')
              .exec(function (err, books) {
                  if (err) { return next(err); }
                  // Successful, so render.
                  res.render('bookinstance_form', { title: 'Create BookInstance', book_list: books, selected_book: bookinstance.book._id , errors: errors.array(), bookinstance: bookinstance });
          });
          return;
      }
      else {
          // Data from form is valid.
          bookinstance.save(function (err) {
              if (err) { return next(err); }
                 // Successful - redirect to new record.
                 res.redirect(bookinstance.url);
              });
      }
  }
];
// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = function(req, res, next) {
  async.parallel({
    book_instance: (callback) => {
      BookInstance.findById(req.params.id).populate('book').exec(callback);
    },
  }, (err, result) => {
    if (err) return next(err);
    res.render('bookinstance_delete', { title: 'Delete Book Instance', book_instance: result.book_instance });
  });
};

// Handle BookInstance delete on PPOST.
exports.bookinstance_delete_post = function(req, res, next) {
  async.parallel({
    book_instance: (callback) => {
      BookInstance.findById(req.body.bookinstanceid).exec(callback);
    }
  }, (err, results) => {
    if (err) return next(err);
    BookInstance.findByIdAndRemove(req.body.bookinstanceid, (err) => {
      if (err) return next(err);
      res.redirect('/catalog/bookinstances');
    })
  })
};

exports.bookinstance_update_get = function(req, res, next) {
  async.parallel({
    bookinstance: (callback) => {
      BookInstance.findById(req.params.id).populate('book').exec(callback);
    },
    books: (callback) => {
      Book.find(callback);
    }
  }, (err, results) => {
    if (err) return next(err);
    if (!results.bookinstance) {
      var err = new Error('Book Instance not found');
      err.status = 404;
      return next(err);
    }
    res.render('bookinstance_form', { title: 'Update Book Instance', bookinstance: results.bookinstance, book_list: results.books });
  })
};

exports.bookinstance_update_post = [
  (req, res, next) => {
    async.parallel({
      book_instance: (callback) => {
        BookInstance.findById(req.body.bookinstanceid).exec(callback);
      },
      book: (callback) => {
        Book.findById(req.body.book).exec(callback);
      }
    }, (err, results) => {
      if (err) return next(err);
      if (results.book) return next();
      var error = new Error('Invalid Book Specified');
      return next(error);
    });
  },
  body('imprint', 'Please specify an imprint').isLength({ min: 1 }).trim(),
  body('due_back').isISO8601(),
  body('status').isIn(['Maintenance', 'Available', 'Loaned', 'Reserved']),
  sanitizeBody('title').escape(),
  sanitizeBody('imprint').escape(),
  sanitizeBody('due_back').escape(),
  sanitizeBody('status').escape(),
  (req, res, next) => {
    const errors = validationResult(req);
    var updated = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      due_back: req.body.due_back,
      status: req.body.status,
      _id: req.params.id
    });
    if (!errors.isEmpty()) {
      async.parallel({
        bookinstance: (callback) => {
          BookInstance.findById(req.params.id).populate('book').exec(callback);
        },
        books: (callback) => {
          Book.find(callback);
        }
      }, (err, results) => {
        if (err) return next(err);
        if (!results.bookinstance) {
          var err = new Error('Book Instance not found');
          err.status = 404;
          return next(err);
        }
        res.render('bookinstance_form', { title: 'Update Book Instance', bookinstance: results.bookinstance, book_list: results.books, errors: errors });
      })
    } else {
      BookInstance.findByIdAndUpdate(req.params.id, updated, {}, (err, newBookInstance) => {
        if (err) return next(err);
        res.redirect(updated.url);
      });
    }
  }
];