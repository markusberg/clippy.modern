# Status 2024-04-20 -- Work in progress

Please note that this project is still incomplete. The code has been modernized, but
there are missing features, and bugs. 

# Clippy.modern

Add Clippy or his friends to any website for instant nostalgia.

This is a modernized version of [Clippy.js](https://github.com/clippyjs/clippy.js).

## Usage: Setup

Add this code to you to your page to enable Clippy.js.

```html
<!-- Add the stylesheet to the head -->
<link rel="stylesheet" type="text/css" href="clippy.css" media="all" />

<!-- Clippy.js -->
<script src="clippy.js" type="module"></script>

<!-- Init script -->
<script type="module">
  import { load } from './clippy.js';

  const agent = await load('Clippy');
  await agent.show();
  await agent.speak('Hello. It looks like you\'re attempting to train a Large Language Model. Would you like some help with that?');
</script>
```

## Usage: Actions

All the agent actions are queued and executed by order, so you could stack them.

```javascript
// play a given animation
agent.play("Searching");

// play a random animation
agent.animate();

// get a list of all the animations
agent.animations();
// => ["MoveLeft", "Congratulate", "Hide", "Pleased", "Acknowledge", ...]

// Show text balloon
agent.speak(
  "When all else fails, bind some paper together. My name is Clippy."
);

// move to the given point, use animation if available
agent.moveTo(100, 100);

// gesture at a given point (if gesture animation is available)
agent.gestureAt(200, 200);

// stop the current action in the queue
agent.stopCurrent();

// stop all actions in the queue and go back to idle mode
agent.stop();
```

## Special Thanks

- The awesome [Cinnamon Software](http://www.cinnamonsoftware.com/) for developing [Double Agent](http://doubleagent.sourceforge.net/)
  the program we used to unpack Clippy and his friends!
- Microsoft, for creating clippy :)
