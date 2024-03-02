clippy.BASE_PATH = "/agents/";

clippy.load = (name, successCb, failCb) => {
  const path = clippy.BASE_PATH + name;

  const mapDfd = clippy.load._loadMap(path);
  const agentDfd = clippy.load._loadAgent(name, path);
  const soundsDfd = clippy.load._loadSounds(name, path);

  let data;
  agentDfd.done((d) => {
    data = d;
  });

  let sounds;

  soundsDfd.done((d) => {
    sounds = d;
  });

  // wrapper to the success callback
  const cb = () => {
    const a = new clippy.Agent(path, data, sounds);
    successCb(a);
  };

  $.when(mapDfd, agentDfd, soundsDfd).done(cb).fail(failCb);
};

clippy.load._maps = {};
clippy.load._loadMap = (path) => {
  let dfd = clippy.load._maps[path];
  if (dfd) return dfd;

  // set dfd if not defined
  dfd = clippy.load._maps[path] = $.Deferred();

  const src = `${path}/map.png`;
  const img = new Image();

  img.onload = dfd.resolve;
  img.onerror = dfd.reject;

  // start loading the map;
  img.setAttribute("src", src);

  return dfd.promise();
};

clippy.load._sounds = {};

clippy.load._loadSounds = (name, path) => {
  let dfd = clippy.load._sounds[name];
  if (dfd) return dfd;

  // set dfd if not defined
  dfd = clippy.load._sounds[name] = $.Deferred();

  const audio = document.createElement("audio");
  const canPlayMp3 =
    !!audio.canPlayType && "" !== audio.canPlayType("audio/mpeg");
  const canPlayOgg =
    !!audio.canPlayType &&
    "" !== audio.canPlayType('audio/ogg; codecs="vorbis"');

  if (!canPlayMp3 && !canPlayOgg) {
    dfd.resolve({});
  } else {
    const src = path + (canPlayMp3 ? "/sounds-mp3.js" : "/sounds-ogg.js");
    // load
    clippy.load._loadScript(src);
  }

  return dfd.promise();
};

clippy.load._data = {};
clippy.load._loadAgent = (name, path) => {
  let dfd = clippy.load._data[name];
  if (dfd) return dfd;

  dfd = clippy.load._getAgentDfd(name);

  const src = `${path}/agent.js`;

  clippy.load._loadScript(src);

  return dfd.promise();
};

clippy.load._loadScript = (src) => {
  const script = document.createElement("script");
  script.setAttribute("src", src);
  script.setAttribute("async", "async");
  script.setAttribute("type", "text/javascript");

  document.head.appendChild(script);
};

clippy.load._getAgentDfd = (name) => {
  let dfd = clippy.load._data[name];
  if (!dfd) {
    dfd = clippy.load._data[name] = $.Deferred();
  }
  return dfd;
};

clippy.ready = (name, data) => {
  const dfd = clippy.load._getAgentDfd(name);
  dfd.resolve(data);
};

clippy.soundsReady = (name, data) => {
  let dfd = clippy.load._sounds[name];
  if (!dfd) {
    dfd = clippy.load._sounds[name] = $.Deferred();
  }

  dfd.resolve(data);
};
