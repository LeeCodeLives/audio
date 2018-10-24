(function(global, $){

/*
 * 兼容Audio接口
 */
var AudioContext = window.AudioContext || window.webkitAudioContext;
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia
                  || navigator.mozGetUserMedia || navigator.msGetUserMedia;

/*
 * 兼容 AudioTranslator 类 暴露出 公共接口 接口
 */
function AudioTranslator() {
  this.support = !!(AudioContext && navigator.getUserMedia && window.Worker);
}

AudioTranslator.prototype = {
  constructor: AudioTranslator,

  init: function(option, cb) {
    option = option || {};
    this.lan = option.lan || 'zh';
    this.workerPath = option.workerPath; 
    this.audioContext = new AudioContext();
    this.converterWrapper = new AudioConverterWrapper(option);
    cb && cb();
  },

  start: function() {
    if (!this.support) return;
    navigator.getUserMedia({
      audio: true
    }, $.proxy(this._start, this), function(e){
      console.error(e);
    });
  },

  _start: function(stream) {

    var audioContext = this.audioContext;
    this.audioInput = audioContext.createMediaStreamSource(stream);
    this.audioRecorder = new Recorder( this.audioInput, {
      workerPath: this.workerPath
    });

    this.audioRecorder.clear();
    this.audioRecorder.record();
  },

  stop: function(cb) {
    if (!this.checkingStart()) return;

    this.audioRecorder.stop();
    this.audioInput.disconnect();
    cb && cb();
  },

  pause: function() {
    if (!this.checkingStart()) return;
    this.audioRecorder.pause();
  },
  
  resume: function() {
    if (!this.checkingStart()) return;
    this.audioRecorder.record();
  },

  playSound: function() {
    this.audioRecorder.playSound();
  },

  stopSound: function() {
    this.audioRecorder.stopSound();
  },

  translate: function(cb) {
    if (!this.checkingStart()) return;
    var self = this;
    this.audioRecorder.exportWAV(this.handle.bind(this),{
        cb: cb,
        type: 'translate'
    });
  },

  upload: function(param, cb) {
    param = param || {};
    if (!this.checkingStart()) return;
    var self = this;
    this.audioRecorder.exportWAV(this.handle.bind(this), {
        cb: cb,
        type: 'upload'
    });
  },

  handle: function(blob, param) {
    if (param.type === 'upload') {
      this.converterWrapper.upload(blob, param, param.cb);
    } else {
      this.converterWrapper.tranlate(blob, {
        'lan': self.lan
      }, param.cb);
    }
  },

  setDownloadUrl: function(hrefId) {
    this.audioRecorder.exportWAV(function(blob){
      Recorder.setupDownload(blob, 'output', hrefId);
    });
  },

  isRecording: function() {
    return this.audioRecorder && this.audioRecorder.isRecording();
  },

  checkingStart: function() {
    if (!this.audioRecorder) {
      console.error('you should call this function before call start method');
    }
    return this.audioRecorder != undefined;
  },

  isSupport: function() {
    return this.support;
  }
}

/*
* ConvertWrapper 这里实现的是不同的将音频转化的包装类
*/
function AudioConverterWrapper(option) {
  this.url = option.url;
  this.uploadUrl = option.uploadUrl;
}

AudioConverterWrapper.prototype = {
  constructor: AudioConverterWrapper,

  tranlate: function(blob, param, cb) {
    this.server(this.url, blob, param, cb);
  },

  upload: function(blob, param, cb) {
    this.server(this.uploadUrl, blob, param, cb);
  },

  server: function(url, blob, param, cb) {
    var formData = new FormData();
    formData.append('file', new File([blob], 'ouput.wav'));
    
    for(var p in param) {
      formData.append(p, param[p]);
    }

    return $.ajax({
      method: 'POST',
      url: url,
      data: formData,
      processData: false,
      contentType: false,
    }).done(function(data){
      cb && cb(data);
    });
  }
}


/*
 * wixin
 */

function WinXinAudioTranslator() {

}

WinXinAudioTranslator.prototype = {
  constructor: WinXinAudioTranslator,

  init: function(option, cb) {

    var weixin = (option && option.weixin) ? option.weixin : {};
    this.uploadUrl = option.uploadUrl;
    this.appId = weixin.appId;
    this.timestamp = weixin.timestamp;
    this.signature = weixin.signature;
    this.nonceStr  = weixin.nonceStr;

    option.weixin && wx.config({
      debug: weixin.debug || false, 
      appId: this.appId, 
      timestamp: this.timestamp,
      nonceStr: this.nonceStr,
      signature: this.signature,
      jsApiList: [
        'startRecord',
        'stopRecord' ,
        'onVoiceRecordEnd',
        'translateVoice',
        'playVoice',
        'stopVoice',
        'uploadVoice'
      ]
    });

    option.weixin && wx.ready(function(res){
      cb && cb(res);
    });
  },

  start: function() {
    this.recording = true;
    wx.startRecord();
  },

  stop: function(cb) {
    this.recording = false;
    self = this;
    wx.stopRecord({
      success: function (res) {
          self.localId = res.localId;
          cb(res.localId);
      }
    });
  },

  pause: function() {
    throw new Error('微信不支持这个方法');
  },
  
  resume: function() {
    throw new Error('微信不支持这个方法');
  },

  playSound: function() {
    if (!this.localId) {
      console.warn('you may no start recording voice');
      return;
    }
    wx.playVoice({
      localId: this.localId // 需要播放的音频的本地ID，由stopRecord接口获得
    });
  },

  stopSound: function() {
    if (!this.localId) {
      console.warn('you may no start recording voice');
      return;
    }
    wx.stopVoice({
      localId: this.localId // 需要播放的音频的本地ID，由stopRecord接口获得
    });
  },

  translate: function(cb) {
    wx.translateVoice({
      localId: this.localId, // 需要识别的音频的本地Id，由录音相关接口获得
      isShowProgressTips: 1, // 默认为1，显示进度提示
      success: function (res) {
        var result, err_no, err_msg;
        if (res.translateResult) {
          result = [res.translateResult];
          err_no = 0;
        } else {
          err_no = 3000;
          err_msg = "未识别语音";
        }
        cb({
          err_no: 0,
          result: result,
          err_msg: err_msg
        });
      }
    });
  },

  upload: function(cb) {
    var self = this;
    wx.uploadVoice({
      localId: this.localId, // 需要上传的音频的本地ID，由stopRecord接口获得
      isShowProgressTips: 1, // 默认为1，显示进度提示
      success: function (res) {
        $.ajax({
          method: 'POST',
          url: self.uploadUrl,
          data: {
            server_id: res.serverId, // 返回音频的服务器端ID,
            weixin: true
          }
        }).done(function(data){
          cb && cb(data);
        })
      }
    });
  },

  isRecording: function() {
    return this.recording;
  },

  checkingStart: function() {
    return this.recording;
  },

  isSupport: function() {
    return true;
  }
}

/*
 * api cloud
 */

function ApiCloudAudioTranslator() {

}

ApiCloudAudioTranslator.prototype = {
  constructor: ApiCloudAudioTranslator,
  init: function(option, cb) {
    var systemType = api.systemType;
    console.log(api);
    this.url = option.url;
    this.uploadUrl = option.uploadUrl;
    if (systemType === 'ios') {
      this.ext = 'wav';
    } else if (systemType === 'android') {
      this.ext = 'amr';
    }
    this.filePath = 'fs://test.' + this.ext;
    this.audioRecorder = api.require('audioRecorder');
    this.audio = api.require('audio');
    cb && cb();
  },

  start: function() {
    this.recording = true;
    var self = this;

    this.audioRecorder.startRecord({
      savePath: this.filePath,
      format: this.ext,
      channel: 1
    }, function(){
      //TODO: error handle
    });
  },

  stop: function(cb) {
    this.recording = false;
    self = this;
    this.audioRecorder.stopRecord(function(ret, err){
      cb && cb();
    })
  },

  pause: function() {
    throw new Error('微信不支持这个方法');
  },
  
  resume: function() {
    throw new Error('微信不支持这个方法');
  },

  playSound: function() {
    this.audio.play({
      path: this.filePath
    }, function(ret, err){
      
    });
  },

  stopSound: function() {
    this.audio.stop();
  },

  translate: function(cb) {
    api.ajax({
      url: this.url,
      method: 'post',
      data: {
        values: {
          ext: this.ext,
          sampleRate: 16000
        },
        files: { 
          file: this.filePath
        }
      }
    },function(ret, err){
      if (err) alert("网络错误");
      cb && cb(ret);
    });
  },

  upload: function(param, cb) {
    param = param || {};
    api.ajax({
      url: this.uploadUrl,
      method: 'post',
      data: {
        values: param,
        files: { 
          file: this.filePath
        }
      }
    },function(ret, err){
      if (err) alert("网络错误");
      cb && cb(ret);
    });
  },

  isRecording: function() {
    return this.recording;
  },

  checkingStart: function() {
    return this.recording;
  },

  isSupport: function() {
    return true;
  }
}


/*
 * 暴露在 window 对象中
 */
function isWinxin() {
  var UA = navigator.userAgent.toLowerCase();
  var matches = UA.match(/MicroMessenger/i);
  return matches && matches.length > 0;
}

function isApiCloud() {
  var UA = navigator.userAgent.toLowerCase();
  var matches = UA.match(/apicloud/i);
  return (matches && matches.length > 0);
}

if (isWinxin()) {
  window.AudioTranslator = WinXinAudioTranslator;
} else if (isApiCloud()) {
  window.AudioTranslator = ApiCloudAudioTranslator;
} else {
  window.AudioTranslator = AudioTranslator;
}

$.isApiCloud = isApiCloud;
$.isWinxin = isWinxin;
})(window, jQuery);


/*
 * jquery api
 */
(function($){
  var translator;
  $.audioTranslator = function(option) {
    if (!translator) {
      translator = new AudioTranslator();
    }
    translator.init(option);

    return translator;
  }
})(jQuery);

(function(window){

  var WORKER_PATH = './recorderWorker.js';
  var worker;
  var Recorder = function(source, cfg){
    var config = cfg || {};
    var bufferLen = config.bufferLen || 4096;
    this.context = source.context;
    if(!this.context.createScriptProcessor){
       this.node = this.context.createJavaScriptNode(bufferLen, 2, 2);
    } else {
       this.node = this.context.createScriptProcessor(bufferLen, 2, 2);
    }
   console.log(cfg);
    worker = worker || new Worker(config.workerPath || WORKER_PATH);

    worker.postMessage({
      command: 'init',
      config: {
        sampleRate: this.context.sampleRate,
        outputRate: 8000,
      }
    });
    var recording = false,
      currCallback = {},
      paramMap = {};

    this.node.onaudioprocess = function(e){
      if (!recording) return;
      worker.postMessage({
        command: 'record',
        buffer: [
          e.inputBuffer.getChannelData(0),
          e.inputBuffer.getChannelData(1)
        ]
      });
    }

    this.configure = function(cfg){
      for (var prop in cfg){
        if (cfg.hasOwnProperty(prop)){
          config[prop] = cfg[prop];
        }
      }
    }

    this.record = function(){
      recording = true;
    }

    this.isRecording = function() {
      return recording;
    }

    this.pause = function(){
      recording = false;
    }

    this.stop = function() {
      this.pause();
      this.node.disconnect();
      source.disconnect();
    }

    this.clear = function(){
      worker.postMessage({ command: 'clear' });
    }

    this.playSound = function() {
      var self = this;
      this.getBuffers(function(buffer){

        var bufferSource = self.context.createBuffer(2, 
          buffer[0].length,
          self.context.sampleRate);
        self.source = self.context.createBufferSource();

        bufferSource.copyToChannel(buffer[0],0,0);
        bufferSource.copyToChannel(buffer[1],1,0);
        self.source.buffer = bufferSource;
        self.source.connect(self.context.destination);
        self.source.start(0);
      })
    }

    this.stopSound = function() {
      this.source && this.source.stop();
    }

    this.getBuffers = function(cb) {
      currCallback['getBuffers'] = cb || config.callback;
      worker.postMessage({ command: 'getBuffers' })
    }

    this.exportWAV = function(cb, param){
      currCallback['exportWAV'] = cb || config.callback;
      type = config.type || 'audio/wav';
      param = param || { type: 'default'};
      paramMap[param.type] = param;
      if (!currCallback) throw new Error('Callback not set');
      worker.postMessage({
        command: 'exportWAV',
        type: type,
        param: param.type
      });
    }

    this.exportWAVBase64 = function(cb, param) {
      currCallback['exportWAVBase64'] = cb || config.callback;
      type = config.type || 'audio/pcm';
      param = param || { type: 'default'};
      paramMap[param.type] = param;
      if (!currCallback) throw new Error('Callback not set');
      worker.postMessage({
        command: 'exportWAVBase64',
        type: type,
        param: param.type
      });
    }

    worker.onmessage = function(e){
      var data = e.data;
      switch(data.type) {
        default:
          currCallback[data.type]
            && currCallback[data.type](data.data, paramMap[e.data.param]);
      }
    }

    source.connect(this.node);
    this.node.connect(this.context.destination);   // if the script node is not connected to an output the "onaudioprocess" event is not triggered in chrome.
  };

  Recorder.setupDownload = function(blob, filename, id){
    var url = (window.URL || window.webkitURL).createObjectURL(blob);
    var link = document.getElementById(id || 'save');
    link.href = url;
    link.download = filename || 'output.wav';
  }

  window.Recorder = Recorder;

})(window);
