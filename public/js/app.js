App = Ember.Application.create();

App.Router.map(function() {
  this.resource('dreams');
  this.resource('dream', { path: '/dreams/:dream_id' }, function() {
    this.resource('comments');
  });
  this.resource('write');
  this.resource('moderate');
});

App.genre = ["Male", "Female", "Not sure"];

App.Store = DS.Store.extend({
  revision: 12,
  adapter: DS.RESTAdapter.extend({})
});

App.IndexRoute = Ember.Route.extend({
  redirect: function() {
    this.transitionTo('dreams');
  }
});

App.DreamsRoute = Ember.Route.extend({
  model: function() {
    return App.Dream.find({query: {visible: true}});
  }
});

App.ModerateRoute = Ember.Route.extend({
  model: function() {
    return App.Dream.find({visible: false});
  },

  setupController: function(controller, model) {
    // controller.set('currentDream', true);
  }
});

App.ModerateController = Ember.ArrayController.extend({
  currentDream: false,
  dreamIndex: 0,

  dreamsLength: function() {
    return this.get('model').get('content').length;
  },

  moreDreams: function() {
    return this.get('dreamIndex') < this.dreamsLength() - 1;
  },

  nextDream: function() {
    if (this.moreDreams()) {
      this.set('dreamIndex', this.get('dreamIndex') + 1);
      this.set('currentDream',
        App.Dream.find(
          this.get('model.content').objectAt(this.get('dreamIndex')).id)
      );
    } else {
      this.set('currentDream', undefined);
    }
  },

  validateDream: function() {
    var currentDream = this.get('currentDream'),
      yes = currentDream.get('yes');

    currentDream.set('yes', yes + 1);
    currentDream.get('transaction').commit();

    this.nextDream();
  },

  refuseDream: function() {
    var currentDream = this.get('currentDream'),
      no = currentDream.get('no');

    currentDream.set('no', no + 1);
    currentDream.get('transaction').commit();

    this.nextDream();
  },

  contentDidLoad: (function() {
    if (this.get('content.isLoaded')) {
      this.set('currentDream',
        App.Dream.find(this.get('model.content').objectAt(0).id));
    }
  }).observes('content.isLoaded')
});

App.WriteRoute = Ember.Route.extend({
  setupController: function(controller, model) {
    controller.set('content', {
      dream: "Last night, I dreamt that ..."
    });
  }
});

App.WriteController = Ember.ObjectController.extend({
  errorState: false,

  submit: function() {
    var dream = this.content;

    if (!dream.dream.length ||
      !(dream.pseudo && dream.pseudo.length) ||
      !(dream.sex && dream.sex.length)) {
      this.set('errorState', true);
      return;
    }

    // creates a model from the content of the view
    this.set('model', App.Dream.createRecord(this.content));
    // sends it to the server
    this.get('store').commit();
    this.transitionToRoute('dreams');
  }
});

App.DreamController = Ember.ObjectController.extend({
  postComment: function() {
    if (!this.get('content.comment_message') ||
      !this.get('content.comment_author')) {
      this.set('errorComment', true);
    } else {
      this.set('errorComment', false);

      this.get('model').addComment({
        author: this.get('content.comment_author'),
        message: this.get('content.comment_message')
      });

      this.get('store').commit();
    }
  },

  niceAction: function() {
    var dream = this.get('model');

    if (localStorage) {
      if (localStorage.getItem(dream.id)) return;

      dream.incrementProperty('nice');
      dream.get('transaction').commit();
      localStorage.setItem(dream.id, true);
    }
  },

  boringAction: function() {
    var dream = this.get('model');

    if (localStorage) {
      if (localStorage.getItem(dream.id)) return;

      dream.incrementProperty('boring');
      dream.get('transaction').commit();
      localStorage.setItem(dream.id, true);
    }
  }
});

App.DreamsController = Ember.ArrayController.extend({
  currentPage: 0,
  firstPage: function() {
    return (this.get('currentPage') === 0) ? true : false;
  }.property('currentPage'),

  getPage: function() {
    this.set('model', App.Dream.find({
      query: { visible: true },
      page: this.get('currentPage')
    }));
  }.observes('currentPage'),

  nextPage: function() {
    this.incrementProperty('currentPage');
  },

  prevPage: function() {
    this.decrementProperty('currentPage');
  }
});

App.Dream = DS.Model.extend({
  dream: DS.attr('string'),
  pseudo: DS.attr('string'),
  sex: DS.attr('string'),
  yes: DS.attr('number'),
  no: DS.attr('number'),
  nice: DS.attr('number'),
  boring: DS.attr('number'),
  comments: DS.hasMany('App.Comment'),
  _version: DS.attr('number'),

  addComment: function(defaults) {
    var newComment = App.Comment.createRecord(defaults);
    this.get('comments').pushObject(newComment);
    this.set('_version', this.get('comments.length'));
    return newComment;
  }
});

App.Comment = DS.Model.extend({
  dream: DS.belongsTo('App.Dream'),
  author: DS.attr('string'),
  message: DS.attr('string')
});