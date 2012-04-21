function EventHandler() {
    this.repeatingHandlers = [];
    this.oneTimeHandlers = [];
    
    this.trigger = function(args) {
        for(x in this.repeatingHandlers) {
            this.repeatingHandlers[x](args);
        }
        
        var handlers = this.oneTimeHandlers.slice();
        this.oneTimeHandlers = [];
        
        for(x in handlers) {
            handlers[x](args);
        }
    }
    
    this.addRepeating = function(handler) {
        this.repeatingHandlers.push(handler);
    }
    
    this.addOnce = function(handler, highPriority) {
        if(highPriority == true) {
            this.oneTimeHandlers.unshift(handler);
        }
        else {
            this.oneTimeHandlers.push(handler);
        }
    }
}


var FileLoader = (function() {
    var loadedFiles = {};
    var pendingFiles = {};
    var numPendingFiles = 0;
    
    var markPending = function(filePath) {
        pendingFiles[filePath] = { onLoad : new EventHandler() };
        numPendingFiles ++;
    }
    
    var isPending = function(filePath) {
        var pending = filePath in pendingFiles;
//        Debug.log("Is this pending: " + filePath + " ? " + pending);
        return pending;
    }
    
    var isLoaded = function(filePath) {
        var loaded = filePath in loadedFiles;
  //      Debug.log("Is this loaded: " + filePath + " ? " + loaded);
        return loaded;
    }

    var markLoaded = function(filePath, loadedObject) {
        if(!isLoaded(filePath) && isPending(filePath)) {   
            Debug.log("FileLoader", "Finished loading " + filePath);
            loadedFiles[filePath] = loadedObject;
            pendingFiles[filePath].onLoad.trigger(loadedObject);
            
            delete pendingFiles[filePath];
            
            numPendingFiles --;
            if(numPendingFiles == 0) {
                FileLoader.onLoadingFinished.trigger();
            }
        }
    }
    
    var addOnFileLoaded = function(filePath, handler) {
        if(isPending(filePath)) {
            pendingFiles[filePath].onLoad.addOnce(handler);
        }
        else if(isLoaded(filePath)) {
            handler(loadedFiles[filePath]);
        }
        else {
            Debug.error("The file " + filePath + " was never requested");
        }
    }
    
    var loadJS = function(filePath) {
        if(!isLoaded(filePath) && !isPending(filePath)) {
            markPending(filePath);
            
            var head = document.getElementsByTagName('head')[0];
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = filePath;
            script.onload = function() {
                markLoaded(filePath, {});
            }
            head.appendChild(script);
        }
    }
    
    var loadImage = function(filePath, onLoaded) {
        if(isLoaded(filePath)) {
            onLoaded(loadedFiles[filePath]);
            return;
        }
        
        if(!isPending(filePath)) {
            markPending(filePath);
            addOnFileLoaded(filePath, onLoaded);
            
            var img = new Image();
            img.src = filePath;
            img.onload = function() {
                markLoaded(filePath, img);
            };
        }
        else {
            addOnFileLoaded(filePath, onLoaded);
        }
    }
    
    var makeRequest = function() {
        return new XMLHttpRequest();
    }
    
    var requestFile = function(filePath, onLoaded, dataProcessor) {
        if(isLoaded(filePath)) {
            onLoaded(loadedFiles[filePath]);
            return;
        }
        
        if(!isPending(filePath)) {
            markPending(filePath);
            addOnFileLoaded(filePath, onLoaded);

            var request = makeRequest();
            request.open("GET", filePath, true);
            
            request.onreadystatechange = function() {
                if(request.readyState == 4) {
                    var data = request.responseText;
                    if(typeof dataProcessor == "function") {
                        data = dataProcessor(data);
                    }
                    
                    markLoaded(filePath, data);
                }
            };
            
            request.send(null);
        }
        else {
            addOnFileLoaded(filePath, onLoaded);
        }
    }
    
    var loadJSON = function(filePath, onLoaded) {
        requestFile(filePath, onLoaded, function(data) {
            return JSON.parse(data);
        });
    }
    
    var loadText = function(filePath, onLoaded) {
        requestFile(filePath, onLoaded, function(data) {
            return data;
        });        
    }
    
    var loadBase64 = function(filePath, onLoaded) {
        requestFile(filePath, onLoaded, function(data) {
            return Base64.decode(data);
        });
    }
    
    var getFile = function(filePath) {
        if(!isLoaded(filePath))
            return null;
            
        return loadedFiles[filePath];
    }

    onLoadingFinished = new EventHandler();
    
    return {
        loadJS : loadJS,
        loadJSON : loadJSON,
        loadText : loadText,
        loadImage : loadImage,
        loadBase64 : loadBase64,
        
        isPending : isPending,
        isLoaded : isLoaded,
        
        getFile : getFile,
        
        finishedLoading : function() { return numPendingFiles == 0; },
        
        onLoadingFinished : onLoadingFinished
    };
})();
