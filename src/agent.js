class Agent {
  constructor(path, data, sounds) {
    this.path = path;
    this._queue = new clippy.Queue($.proxy(this._onQueueEmpty, this));
    this._el = $('<div class="clippy"></div>').hide();
    $(document.body).append(this._el);
    this._animator = new clippy.Animator(this._el, path, data, sounds);
    this._balloon = new clippy.Balloon(this._el);
    this._setupEvents();
  }

  /***
   *
   * @param {Number} x
   * @param {Number} y
   */
  gestureAt(x, y) {
    const d = this._getDirection(x, y);
    const gAnim = `Gesture${d}`;
    const lookAnim = `Look${d}`;

    const animation = this.hasAnimation(gAnim) ? gAnim : lookAnim;
    return this.play(animation);
  }

  /***
   *
   * @param {Boolean=} fast
   *
   */
  hide(fast, callback) {
    this._hidden = true;
    const el = this._el;
    this.stop();
    if (fast) {
      this._el.hide();
      this.stop();
      this.pause();
      if (callback) callback();
      return;
    }

    return this._playInternal("Hide", function () {
      el.hide();
      this.pause();
      if (callback) callback();
    });
  }

  moveTo(x, y, duration = 1000) {
    const dir = this._getDirection(x, y);
    const anim = `Move${dir}`;

    this._addToQueue(function (complete) {
      // the simple case
      if (duration === 0) {
        this._el.css({ top: y, left: x });
        this.reposition();
        complete();
        return;
      }

      // no animations
      if (!this.hasAnimation(anim)) {
        this._el.animate({ top: y, left: x }, duration, complete);
        return;
      }

      const callback = $.proxy(function (name, state) {
        // when exited, complete
        if (state === clippy.Animator.States.EXITED) {
          complete();
        }
        // if waiting,
        if (state === clippy.Animator.States.WAITING) {
          this._el.animate(
            { top: y, left: x },
            duration,
            $.proxy(function () {
              // after we're done with the movement, do the exit animation
              this._animator.exitAnimation();
            }, this)
          );
        }
      }, this);

      this._playInternal(anim, callback);
    }, this);
  }

  _playInternal(animation, callback) {
    // if we're inside an idle animation,
    if (
      this._isIdleAnimation() &&
      this._idleDfd &&
      this._idleDfd.state() === "pending"
    ) {
      this._idleDfd.done(
        $.proxy(function () {
          this._playInternal(animation, callback);
        }, this)
      );
    }

    this._animator.showAnimation(animation, callback);
  }

  play(animation, timeout = 5000, cb = undefined) {
    if (!this.hasAnimation(animation)) return false;

    this._addToQueue(function (complete) {
      let completed = false;
      // handle callback
      const callback = (name, state) => {
        if (state === clippy.Animator.States.EXITED) {
          completed = true;
          if (cb) cb();
          complete();
        }
      };

      // if has timeout, register a timeout function
      if (timeout) {
        window.setTimeout(
          $.proxy(function () {
            if (completed) return;
            // exit after timeout
            this._animator.exitAnimation();
          }, this),
          timeout
        );
      }

      this._playInternal(animation, callback);
    }, this);

    return true;
  }

  /***
   *
   * @param {Boolean=} fast
   */
  show(fast) {
    this._hidden = false;
    if (fast) {
      this._el.show();
      this.resume();
      this._onQueueEmpty();
      return;
    }

    if (this._el.css("top") === "auto" || !this._el.css("left") === "auto") {
      const left = $(window).width() * 0.8;
      const top = ($(window).height() + $(document).scrollTop()) * 0.8;
      this._el.css({ top: top, left: left });
    }

    this.resume();
    return this.play("Show");
  }

  /***
   *
   * @param {String} text
   */
  speak(text, hold) {
    this._addToQueue(function (complete) {
      this._balloon.speak(complete, text, hold);
    }, this);
  }

  /***
   * Close the current balloon
   */
  closeBalloon() {
    this._balloon.hide();
  }

  delay(time = 250) {
    this._addToQueue(function (complete) {
      this._onQueueEmpty();
      window.setTimeout(complete, time);
    });
  }

  /***
   * Skips the current animation
   */
  stopCurrent() {
    this._animator.exitAnimation();
    this._balloon.close();
  }

  stop() {
    // clear the queue
    this._queue.clear();
    this._animator.exitAnimation();
    this._balloon.hide();
  }

  /***
   *
   * @param {String} name
   * @returns {Boolean}
   */
  hasAnimation(name) {
    return this._animator.hasAnimation(name);
  }

  /***
   * Gets a list of animation names
   *
   * @return {Array.<string>}
   */
  animations() {
    return this._animator.animations();
  }

  /***
   * Play a random animation
   * @return {jQuery.Deferred}
   */
  animate() {
    const animations = this.animations();
    const anim = animations[Math.floor(Math.random() * animations.length)];
    // skip idle animations
    if (anim.indexOf("Idle") === 0) {
      return this.animate();
    }
    return this.play(anim);
  }

  /**************************** Utils ************************************/

  /***
   *
   * @param {Number} x
   * @param {Number} y
   * @return {String}
   * @private
   */
  _getDirection(x, y) {
    const offset = this._el.offset();
    const h = this._el.height();
    const w = this._el.width();

    const centerX = offset.left + w / 2;
    const centerY = offset.top + h / 2;

    const a = centerY - y;
    const b = centerX - x;

    const r = Math.round((180 * Math.atan2(a, b)) / Math.PI);

    // Left and Right are for the character, not the screen :-/
    if (-45 <= r && r < 45) return "Right";
    if (45 <= r && r < 135) return "Up";
    if ((135 <= r && r <= 180) || (-180 <= r && r < -135)) return "Left";
    if (-135 <= r && r < -45) return "Down";

    // sanity check
    return "Top";
  }

  /**************************** Queue and Idle handling ************************************/

  /***
   * Handle empty queue.
   * We need to transition the animation to an idle state
   * @private
   */
  _onQueueEmpty() {
    if (this._hidden || this._isIdleAnimation()) return;
    const idleAnim = this._getIdleAnimation();
    this._idleDfd = $.Deferred();

    this._animator.showAnimation(idleAnim, $.proxy(this._onIdleComplete, this));
  }

  _onIdleComplete(name, state) {
    if (state === clippy.Animator.States.EXITED) {
      this._idleDfd.resolve();
    }
  }

  /***
   * Is the current animation is Idle?
   * @return {Boolean}
   * @private
   */
  _isIdleAnimation() {
    const c = this._animator.currentAnimationName;
    return c && c.indexOf("Idle") === 0;
  }

  /**
   * Gets a random Idle animation
   * @return {String}
   * @private
   */
  _getIdleAnimation() {
    const idleAnimations = this.animations().filter((anim) =>
      anim.includes("Idle")
    );

    // pick one
    const idx = Math.floor(Math.random() * idleAnimations.length);
    return r[idx];
  }

  /**************************** Events ************************************/

  _setupEvents() {
    $(window).on("resize", $.proxy(this.reposition, this));

    this._el.on("mousedown", $.proxy(this._onMouseDown, this));

    this._el.on("dblclick", $.proxy(this._onDoubleClick, this));
  }

  _onDoubleClick() {
    if (!this.play("ClickedOn")) {
      this.animate();
    }
  }

  reposition() {
    if (!this._el.is(":visible")) return;
    const o = this._el.offset();
    const bH = this._el.outerHeight();
    const bW = this._el.outerWidth();

    const wW = $(window).width();
    const wH = $(window).height();
    const sT = $(window).scrollTop();
    const sL = $(window).scrollLeft();

    let top = o.top - sT;
    let left = o.left - sL;
    const m = 5;
    if (top - m < 0) {
      top = m;
    } else if (top + bH + m > wH) {
      top = wH - bH - m;
    }

    if (left - m < 0) {
      left = m;
    } else if (left + bW + m > wW) {
      left = wW - bW - m;
    }

    this._el.css({ left: left, top: top });
    // reposition balloon
    this._balloon.reposition();
  }

  _onMouseDown(e) {
    e.preventDefault();
    this._startDrag(e);
  }

  /**************************** Drag ************************************/

  _startDrag(e) {
    // pause animations
    this.pause();
    this._balloon.hide(true);
    this._offset = this._calculateClickOffset(e);

    this._moveHandle = $.proxy(this._dragMove, this);
    this._upHandle = $.proxy(this._finishDrag, this);

    $(window).on("mousemove", this._moveHandle);
    $(window).on("mouseup", this._upHandle);

    this._dragUpdateLoop = window.setTimeout(
      $.proxy(this._updateLocation, this),
      10
    );
  }

  _calculateClickOffset(e) {
    const mouseX = e.pageX;
    const mouseY = e.pageY;
    const o = this._el.offset();
    return {
      top: mouseY - o.top,
      left: mouseX - o.left,
    };
  }

  _updateLocation() {
    this._el.css({ top: this._targetY, left: this._targetX });
    this._dragUpdateLoop = window.setTimeout(
      $.proxy(this._updateLocation, this),
      10
    );
  }

  _dragMove(e) {
    e.preventDefault();
    const x = e.clientX - this._offset.left;
    const y = e.clientY - this._offset.top;
    this._targetX = x;
    this._targetY = y;
  }

  _finishDrag() {
    window.clearTimeout(this._dragUpdateLoop);
    // remove handles
    $(window).off("mousemove", this._moveHandle);
    $(window).off("mouseup", this._upHandle);
    // resume animations
    this._balloon.show();
    this.reposition();
    this.resume();
  }

  _addToQueue(func, scope) {
    const f = scope ? $.proxy(func, scope) : func;
    this._queue.queue(f);
  }

  /**************************** Pause and Resume ************************************/

  pause() {
    this._animator.pause();
    this._balloon.pause();
  }

  resume() {
    this._animator.resume();
    this._balloon.resume();
  }
}
