(function() {

  /**
   *
   * Backbone Game Engine - An elementary HTML5 canvas game engine using Backbone.
   *
   * Copyright (c) 2014 Martin Drapeau
   * https://github.com/martindrapeau/backbone-game-engine
   *
   */
   
  var sequenceDelay = 300,
      animations;

  // Mushroom is the base enemie class.
  Backbone.Mushroom = Backbone.Character.extend({
    defaults: _.extend(_.deepClone(Backbone.Character.prototype.defaults), {
      name: "mushroom",
      type: "character",
      width: 32,
      height: 64,
      paddingTop: 32,
      spriteSheet: "enemies",
      state: "idle-left",
      velocity: 0,
      yVelocity: 0,
      collision: true,
      aiDelay: 0
    }),
    animations: _.extend(_.deepClone(Backbone.Character.prototype.animations), {
      "squished-left": {
        sequences: [2],
        velocity: 0,
        scaleX: 1,
        scaleY: 1
      },
      "squished-right": {
        sequences: [2],
        velocity: 0,
        scaleX: -1,
        scaleY: 1
      }
    }),
    ai: function(dt) {
      var cur = this.getStateInfo();
      if (cur.mov == "squished" && !this.get("collision")) this.cancelUpdate = true;
      return this;
    },
    isAttacking: function(sprite, dir, dir2) {
      if (this.cancelUpdate) return false;
      var cur = this.getStateInfo();
      return (cur.mov == "walk" || cur.mov == "idle");
    },
    squish: function(sprite) {
      var self = this,
          cur = this.getStateInfo();
      console.log("squish")
      this.set({
        state: this.buildState("squished", cur.dir),
        collision: false
      });
      this.world.setTimeout(function() {
        if (self && self.world) self.world.remove(self);
      }, 2000);
      this.cancelUpdate = true;
      return this;
    },
    hit: function(sprite, dir, dir2) {
      var cur = this.getStateInfo();
      if (cur.mov != "walk" && cur.mov != "idle") return this;

      if (sprite.get("hero")) {
        if (dir == "top") {
          this.squish.apply(this, arguments);
          sprite.trigger("hit", this, "bottom");
        } else {
          sprite.trigger("hit", this, dir == "left" ? "right" : "left");
        }
      } else if (sprite.get("state").indexOf("slide") == 0) {
        this.knockout(sprite, dir);
        sprite.trigger("hit", this, dir == "left" ? "right" : "left");
      }
      return this;
    },
    getHitReaction: function(sprite, dir, dir2) {
      var type = sprite.get("type"),
          state = sprite.get("state");
      if (dir == "bottom" && type == "tile" && state == "bounce") return "ko";
      return ((dir == "left" || dir == "right") && (state == "slide-left" || state == "slide-right")) ? null : Backbone.Character.prototype.getHitReaction.apply(this, arguments);
    }
  });

  Backbone.Turtle = Backbone.Mushroom.extend({
    defaults: _.extend(_.deepClone(Backbone.Mushroom.prototype.defaults), {
      name: "turtle"
    }),
    animations: _.deepClone(Backbone.Mushroom.prototype.animations),
    isAttacking: function() {
      var cur = this.getStateInfo();
      return (cur.mov == "walk" || cur.mov == "idle" || cur.mov == "slide");
    },
    squish: function(sprite, dir, dir2) {
      var cur = this.getStateInfo();

      if (this.wakeTimerId) {
        clearTimeout(this.wakeTimerId);
        this.wakeTimerId = null;
      }

      if (cur.mov == "squished" || cur.mov == "wake") {
        var opo = sprite.getCenterX(true) > this.getCenterX(true) ? "left" : "right";
        this.set("state", this.buildState("slide", opo));
      } else {
        this.set("state", this.buildState("squished", cur.dir));
        this.wakeTimerId = this.world.setTimeout(this.wake.bind(this), 5000);
      }

      this.cancelUpdate = true;
      return this;
    },
    hit: function(sprite, dir, dir2) {
      var cur = this.getStateInfo(),
          opo = dir == "left" ? "right" : (dir == "right" ? "left" : (dir == "top" ? "bottom" : "top"));
      if (cur.mov == "slide") this.cancelUpdate = true;

      if (!sprite.get("hero"))
        return Backbone.Mushroom.prototype.hit.apply(this, arguments);

      if (cur.mov == "slide") console.log("turtle hit slide", sprite.get("name"), dir, dir2);
      
      if (dir == "top") {
        this.squish.apply(this, arguments);
        sprite.trigger("hit", this, "bottom");
        return this;
      }

      if (this.isAttacking()) {
        sprite.trigger("hit", this, opo);
        return this;
      }

      // Hit left or right
      if (cur.mov == "squished" || cur.mov == "wake") {

        if (this.wakeTimerId) {
          clearTimeout(this.wakeTimerId);
          this.wakeTimerId = null;
        }

        this.set("state", this.buildState("slide", dir == "left" ? "right" : "left"));
        sprite.trigger("hit", this, "bottom");
        this.cancelUpdate = true;
      }
      return this;
    },
    wake: function() {
      var cur = this.getStateInfo();
      this.wakeTimerId = null;

      if (cur.mov == "squished") {
        this.set("state", this.buildState("wake", cur.dir));
        this.wakeTimerId = setTimeout(this.wake.bind(this), 5000);
      } else if (cur.mov == "wake") {
        this.set("state", this.buildState("walk", cur.dir));
      }
      return this;
    },
    getHitReaction: function(sprite, dir, dir2) {
      var state = this.get("state");
      return ((dir == "left" || dir == "right") && (state == "slide-left" || state == "slide-right")) ? null : Backbone.Mushroom.prototype.getHitReaction.apply(this, arguments);
    }
  });
  animations = Backbone.Turtle.prototype.animations;
  animations["idle-left"].sequences = animations["idle-right"].sequences =
    animations["fall-left"].sequences = animations["fall-right"].sequences =
    animations["ko-left"].sequences = animations["ko-right"].sequences = [6];
  animations["walk-left"].sequences = animations["walk-right"].sequences = [6, 7];
  animations["squished-left"].sequences = animations["squished-right"].sequences = [10];
  _.extend(animations, {
    "wake-left": {
      sequences: [10, 11],
      velocity: 0,
      scaleX: 1,
      scaleY: 1,
      delay: sequenceDelay
    },
    "wake-right": {
      sequences: [10, 11],
      velocity: 0,
      scaleX: -1,
      scaleY: 1,
      delay: sequenceDelay
    },
    "slide-left": {
      sequences: [10],
      velocity: -300,
      scaleX: 1,
      scaleY: 1
    },
    "slide-right": {
      sequences: [10],
      velocity: 300,
      scaleX: -1,
      scaleY: 1
    }
  });

  Backbone.FlyingTurtle = Backbone.Turtle.extend({
    defaults: _.extend(_.deepClone(Backbone.Turtle.prototype.defaults), {
      name: "flying-turtle"
    }),
    animations: _.deepClone(Backbone.Turtle.prototype.animations),
    fallbackSprite: Backbone.Turtle,
    onUpdate: function(dt) {
      var cur = this.getStateInfo(),
          animation = this.getAnimation(),
          attrs = {};
      if (cur.mov == "walk" && this.world.get("state") == "play") {
          attrs.state = this.buildState("fall", cur.dir);
          attrs.yVelocity = -this.animations["fall-right"].yVelocity;
      }
      if (!_.isEmpty(attrs)) this.set(attrs);
      return true;
    },
    squish: function(sprite) {
      var cur = this.getStateInfo();
      var newSprite = new this.fallbackSprite({
        x: this.get("x"),
        y: this.get("y"),
        state: "walk-" + cur.dir
      });
      newSprite.set("id", this.world.buildIdFromName(newSprite.get("name")));
      this.world.add(newSprite);
      this.world.remove(this);
    }
  });
  animations = Backbone.FlyingTurtle.prototype.animations;
  animations["idle-left"].sequences = animations["idle-right"].sequences =
    animations["fall-left"].sequences = animations["fall-right"].sequences =
    animations["ko-left"].sequences = animations["ko-right"].sequences = [8];
  animations["walk-left"].sequences = animations["walk-right"].sequences = [8, 9];

  Backbone.RedTurtle = Backbone.Turtle.extend({
    defaults: _.extend(_.deepClone(Backbone.Turtle.prototype.defaults), {
      name: "red-turtle"
    }),
    animations: _.deepClone(Backbone.Turtle.prototype.animations)
  });
  animations = Backbone.RedTurtle.prototype.animations;
  animations["idle-left"].sequences = animations["idle-right"].sequences =
    animations["fall-left"].sequences = animations["fall-right"].sequences =
    animations["ko-left"].sequences = animations["ko-right"].sequences = [108];
  animations["walk-left"].sequences = animations["walk-right"].sequences = [108, 109];
  animations["squished-left"].sequences = animations["squished-right"].sequences =
  animations["slide-left"].sequences = animations["slide-right"].sequences = [112];
  animations["wake-left"].sequences = animations["wake-right"].sequences = [112, 113];

  Backbone.RedFlyingTurtle = Backbone.FlyingTurtle.extend({
    defaults: _.extend(_.deepClone(Backbone.FlyingTurtle.prototype.defaults), {
      name: "red-flying-turtle"
    }),
    animations: _.deepClone(Backbone.FlyingTurtle.prototype.animations),
    fallbackSprite: Backbone.RedTurtle
  });
  animations = Backbone.RedFlyingTurtle.prototype.animations;
  animations["idle-left"].sequences = animations["idle-right"].sequences =
    animations["fall-left"].sequences = animations["fall-right"].sequences =
    animations["ko-left"].sequences = animations["ko-right"].sequences = [110];
  animations["walk-left"].sequences = animations["walk-right"].sequences = [110, 111];
  animations["squished-left"].sequences = animations["squished-right"].sequences =
  animations["slide-left"].sequences = animations["slide-right"].sequences = [112];
  animations["wake-left"].sequences = animations["wake-right"].sequences = [112, 113];

  Backbone.Beetle = Backbone.Turtle.extend({
    defaults: _.extend(_.deepClone(Backbone.Turtle.prototype.defaults), {
      name: "beetle"
    }),
    animations: _.deepClone(Backbone.Turtle.prototype.animations)
  });
  animations = Backbone.Beetle.prototype.animations;
  animations["idle-left"].sequences = animations["idle-right"].sequences =
    animations["fall-left"].sequences = animations["fall-right"].sequences =
    animations["ko-left"].sequences = animations["ko-right"].sequences = [33];
  animations["walk-left"].sequences = animations["walk-right"].sequences = [33, 32];
  animations["squished-left"].sequences = animations["squished-right"].sequences =
  animations["slide-left"].sequences = animations["slide-right"].sequences = 
  animations["wake-left"].sequences = animations["wake-right"].sequences =[34];

  Backbone.Spike = Backbone.Mushroom.extend({
    defaults: _.extend(_.deepClone(Backbone.Mushroom.prototype.defaults), {
      name: "spike"
    }),
    animations: _.deepClone(Backbone.Mushroom.prototype.animations),
    squish: function() {}
  });
  animations = Backbone.Spike.prototype.animations;
  animations["idle-left"].sequences = animations["idle-right"].sequences =
    animations["fall-left"].sequences = animations["fall-right"].sequences =
    animations["ko-left"].sequences = animations["ko-right"].sequences = [133];
  animations["walk-left"].sequences = animations["walk-right"].sequences = [133, 132];

}).call(this);