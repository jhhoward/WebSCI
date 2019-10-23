// A simple class to handle a binary buffer
// TODO: Use the typed array classes on browsers that support it

function BinaryBuffer(size) {
    this.data = new Array(size);
    
    
    
    
}

BinaryBuffer.prototype = {
    getPtr : function(index) {
        return new ArrayPtr(this.data, index);
    },

    resize : function(newSize) {
        this.data.length = newSize;
    },
    
    getLength : function() {
        return this.data.length;
    },

    getByte : function(offset) {
        return this.data[offset];
    },
    
    getSignedByte : function(offset) {
        var uint8 = this.data[offset];
        if((uint8 & 0x80) != 0) {
           return -1 * ( (~(uint8 - 1)) & 0xFF);
        }
        return uint8;
    },
    
    setByte : function(offset, value) {
        this.data[offset] = value;
    },
    
    getUint16LE : function(offset) {
        return this.data[offset] | (this.data[offset + 1] << 8);
    },
    
    getSint16LE : function(offset) {
        var uint16 = this.data[offset] | (this.data[offset + 1] << 8);
        if((uint16 & 0x8000) != 0) {
           return -1 * ( (~(uint16 - 1)) & 0xFFFF);
        }
        return uint16;
    },
    
    hexdump : function() {
        var n = 0;
        while(n < this.data.length) {
            var str = "";
            
            str = n.toString(16) + " ";
            while(str.length < 8) {
                str = "0" + str;
            }
            
            for(var x = 0; x<16 && n<this.data.length; x++) {
                var hex = this.data[n++].toString(16);
                if(hex.length == 1) {
                    hex = "0" + hex;
                }
                str = str + hex + " ";
            }
            Debug.log(str);
        }
    }
};

var Base64 = (function() {
    var _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

    var decode = function(input) {
        var output = new BinaryBuffer(input.length);
        var dataLength = 0;
        
        var chr1, chr2, chr3;
		var enc1, enc2, enc3, enc4;
		var i = 0;
 
		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
 
		while (i < input.length) {
			enc1 = _keyStr.indexOf(input.charAt(i++));
			enc2 = _keyStr.indexOf(input.charAt(i++));
			enc3 = _keyStr.indexOf(input.charAt(i++));
			enc4 = _keyStr.indexOf(input.charAt(i++));
 
			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;
 
			output.setByte(dataLength++, chr1);
 
			if (enc3 != 64) {
    			output.setByte(dataLength++, chr2);
			}
			if (enc4 != 64) {
                output.setByte(dataLength++, chr3);
			}
		}

        output.resize(dataLength);
    
        return output;        
    }

    return {
        decode : decode
    };
})();

var Input = (function() {
    var inputEvents = [];
    var pressedKeys = [];
    var mouseX = 0;
    var mouseY = 0;
    
    var onKeyDown = function(event) {
        pressedKeys[event.keyCode] = true;
        inputEvents.push(event);
    };
    var onKeyUp = function(event) {
        pressedKeys[event.keyCode] = false;
        inputEvents.push(event);
    };
    
    function onMouseDown(event) {
        inputEvents.push(event);
    }

    function onMouseUp(event) {
        inputEvents.push(event);
    }
    
    function onMouseMove(event) {
        // Convert from real screen to 320x200:
        mouseX = parseInt(event.offsetX * 320 / 640);
        mouseY = parseInt(event.offsetY * 200 / 400);
    }

    
    return {
        left : 37,
        up : 38,
        right : 39,
        down : 40,
        
        init : function() {
            document.onkeydown = onKeyDown;
            document.onkeyup = onKeyUp;
            
            var pageCanvasElement = Screen.getPageCanvas();
            pageCanvasElement.addEventListener('mousedown', onMouseDown, false);
            pageCanvasElement.addEventListener('mouseup', onMouseUp, false);
            pageCanvasElement.addEventListener('mousemove', onMouseMove, false);
        },
        
        getEvent : function() {
            if(inputEvents.length > 0) {
                var ev = inputEvents.shift();
                return ev;
            }
            return null;
        },
        
        getKey : function(keyCode) {
            if(typeof pressedKeys[keyCode] != 'undefined') {
                return pressedKeys[keyCode];
            }
            return false;
        },
        
        getMousePosition : function() { 
            return { x : mouseX, y : mouseY };
        }
    };
})();
var GfxScreenMasks = {
	VISUAL		: 1,
	PRIORITY	: 2,
	CONTROL		: 4,
	DISPLAY		: 8, // not official sierra sci, only used internally
	ALL			: 1|2|4
};

var Screen = (function() {
    var pageCanvasElement = null;           // The page canvas
    var pageContext = null;
    var pageCanvasWidth = 320;
    var pageCanvasHeight = 200;
    
    var internalCanvas = null;              // The buffer that the game draws to
    var internalContext = null;
    
    var hudCanvas = null;
    var hudContext = null;
    
    var loadingImage = null;
    
    var mouseX = 0;
    var mouseY = 0;
    
    var getCanvasContext = function(element) {
        if (element.getContext) {
            return element.getContext("2d");
        }
        else return null;    
    };
    
    var init = function() {
        pageCanvasElement = document.getElementById("canvas");
        pageContext = pageCanvasElement.getContext("2d");
        pageCanvasElement.cursor = 'none';
        
        pageCanvasElement.style.width = "640px";
        pageCanvasElement.style.height = "480px";
        
        internalCanvas = document.createElement("canvas");
        internalCanvas.width = "320";
        internalCanvas.height = "200";
//        document.body.appendChild(internalCanvas);
        
        internalContext = internalCanvas.getContext("2d");
        
        internalContext.fillStyle = "rgb(255, 0, 255)";
        internalContext.fillRect(0, 0, 320, 200);

        hudCanvas = document.createElement("canvas");
        hudCanvas.width = "320";
        hudCanvas.height = "200";
        hudContext = hudCanvas.getContext("2d");
        
        FileLoader.loadImage("img/loading.png", function(image) {
            loadingImage = image;
            console.log(image);
        });

    }
    
    var clear = function(context) {
  //      context.setTransform(1, 0, 0, 1, 0, 0);   
//        context.fillStyle = "rgb(0, 0, 0)";
  //      context.fillRect(0, 0, 320, 200);
//        context.
    }
    
    var render = function() {
       // clear();
        /*hudContext.clearRect(0, 0, 320, 200);

        if(!FileLoader.finishedLoading() && loadingImage != null) {        
            hudContext.drawImage(loadingImage, 320 - 17, 200 - 17);
        }
        
        if(currentCursor != null) {
            var mousePosition = Input.getMousePosition();
            hudContext.drawImage(currentCursor.image, mousePosition.x, mousePosition.y);
        }
*/
                
/*        internalContext.strokeStyle = "rgb(255, 255, 255)";
        internalContext.strokeRect(mouseX, mouseY, 16, 16);
  */      
        //pageContext.drawImage(internalCanvas, 0, 0, 320, 200, 0, 0, pageCanvasWidth, pageCanvasHeight);
        //pageContext.drawImage(hudCanvas, 0, 0, 320, 200, 0, 0, pageCanvasWidth, pageCanvasHeight);
        
    }
    
    function convertRectCoordinates(rect) {
        var output = rect.clone();
        output.top = parseInt(output.top * pageCanvasHeight / 200);
        output.left = parseInt(output.left * pageCanvasWidth / 320);
        output.bottom = parseInt(output.bottom * pageCanvasHeight / 200);
        output.right = parseInt(output.right * pageCanvasWidth / 320);
        
//        output.clip(new Rect(0, 0, pageCanvasWidth, pageCanvasHeight));
        return output;
    }
    
    function updateRect(rect) {
        rect = rect.clone();
        rect.clip(new Rect(0, 0, 320, 200));
        
        if(rect.width() <= 0 || rect.height() <= 0)
            return;
            
        var outputRect = convertRectCoordinates(rect);

        pageContext.drawImage(internalCanvas, rect.left, rect.top, rect.width(), rect.height(), outputRect.left, outputRect.top, outputRect.width(), outputRect.height());
    }
    
    return {
        init : init,
        clear : clear,
        render : render,
        updateRect : updateRect,
        getContext : function() { return internalContext; },
        getPageCanvas : function() { return pageCanvasElement; },
        width : 320,
        height : 200
    };

})();


function Point(x, y) {
    if(typeof x == 'undefined') {
        x = 0;
        y = 0;
    }

    this.x = x;
    this.y = y;
}

Point.prototype = {
	sqrDist : function(p) {
		var diffx = Math.abs(p.x - x);
		if (diffx >= 0x1000)
			return 0xFFFFFF;

		var diffy = Math.abs(p.y - y);
		if (diffy >= 0x1000)
			return 0xFFFFFF;

		return parseInt(diffx * diffx + diffy * diffy);
	}
};


function Rect(x1, y1, x2, y2) {
    if(typeof x1 == 'undefined') {
        x1 = y1 = x2 = y2 = 0;
    }
    else if(typeof x2 == 'undefined') {
        x2 = x1;
        y2 = y1;
        x1 = 0;
        y1 = 0;
    }

    this.top = y1;
    this.left = x1;
    this.bottom = y2;
    this.right = x2;
}

Rect.prototype = {
    clone : function() {
        return new Rect(this.left, this.top, this.right, this.bottom);
    },
	width : function() { return this.right - this.left; },
	height : function() { return this.bottom - this.top; },

	setWidth : function(aWidth) {
		this.right = this.left + aWidth;
	},

	setHeight : function(aHeight) {
		this.bottom = this.top + aHeight;
	},

	/**
	 * Check if given position is inside this rectangle.
	 *
	 * @param x the horizontal position to check
	 * @param y the vertical position to check
	 *
	 * @return true if the given position is inside this rectangle, false otherwise
	 */
	contains : function(x, y) {
		return (this.left <= x) && (x < this.right) && (this.top <= y) && (y < this.bottom);
	},

	/**
	 * Check if the given rect is contained inside this rectangle.
	 *
	 * @param r The rectangle to check
	 *
	 * @return true if the given rect is inside, false otherwise
	 */
	containsRect : function(r) {
		return (this.left <= r.left) && (r.right <= this.right) && (this.top <= r.top) && (r.bottom <= this.bottom);
	},

	/**
	 * Check if the given rect is equal to this one.
	 *
	 * @param r The rectangle to check
	 *
	 * @return true if the given rect is equal, false otherwise
	 */
	equals : function(r)  {
		return (this.left == r.left) && (this.right == r.right) && (this.top == r.top) && (this.bottom == r.bottom);
	},

	/**
	 * Check if given rectangle intersects with this rectangle
	 *
	 * @param r the rectangle to check
	 *
	 * @return true if the given rectangle is inside the rectangle, false otherwise
	 */
	intersects : function(r) {
		return (this.left < r.right) && (r.left < this.right) && (this.top < r.bottom) && (r.top < this.bottom);
	},

	/**
	 * Extend this rectangle so that it contains r
	 *
	 * @param r the rectangle to extend by
	 */
	extend : function(r) {
		this.left = Math.min(this.left, r.left);
		this.right = Math.max(this.right, r.right);
		this.top = Math.min(this.top, r.top);
		this.bottom = Math.max(this.bottom, r.bottom);
	},

	/**
	 * Extend this rectangle in all four directions by the given number of pixels
	 *
	 * @param offset the size to grow by
	 */
	grow : function(offset) {
		this.top -= offset;
		this.left -= offset;
		this.bottom += offset;
		this.right += offset;
	},

	clip : function(r) {
		if (this.top < r.top) this.top = r.top;
		else if (this.top > r.bottom) this.top = r.bottom;

		if (this.left < r.left) this.left = r.left;
		else if (this.left > r.right) this.left = r.right;

		if (this.bottom > r.bottom) this.bottom = r.bottom;
		else if (this.bottom < r.top) this.bottom = r.top;

		if (this.right > r.right) this.right = r.right;
		else if (this.right < r.left) this.right = r.left;
	},

	isEmpty : function() {
		return (this.left >= this.right || this.top >= this.bottom);
	},

	isValidRect : function() {
		return (this.left <= this.right && this.top <= this.bottom);
	},

	moveTo : function(x, y) {
		this.bottom += y - this.top;
		this.right += x - this.left;
		this.top = y;
		this.left = x;
	},

	translate : function(dx, dy) {
		this.left += dx; this.right += dx;
		this.top += dy; this.bottom += dy;
	}
};

var SciVersion = {
	SCI_VERSION_NONE : 0,
	SCI_VERSION_0_EARLY : 1, // KQ4 early, LSL2 early, XMAS card 1988
	SCI_VERSION_0_LATE : 2, // KQ4, LSL2, LSL3, SQ3 etc
	SCI_VERSION_01 : 3, // KQ1 and multilingual games (S.old.*)
	SCI_VERSION_1_EGA_ONLY : 4, // SCI 1 EGA with parser (i.e. QFG2 only)
	SCI_VERSION_1_EARLY : 5, // KQ5 floppy, SQ4 floppy, XMAS card 1990, Fairy tales, Jones floppy
	SCI_VERSION_1_MIDDLE : 6, // LSL1, Jones CD
	SCI_VERSION_1_LATE : 7, // Dr. Brain 1, EcoQuest 1, Longbow, PQ3, SQ1, LSL5, KQ5 CD
	SCI_VERSION_1_1 : 8, // Dr. Brain 2, EcoQuest 1 CD, EcoQuest 2, KQ6, QFG3, SQ4CD, XMAS 1992 and many more
	SCI_VERSION_2 : 9, // GK1, PQ4 floppy, QFG4 floppy
	SCI_VERSION_2_1 : 10, // GK2, KQ7, LSL6 hires, MUMG Deluxe, Phantasmagoria 1, PQ4CD, PQ:SWAT, QFG4CD, Shivers 1, SQ6, Torin
	SCI_VERSION_3 : 11 // LSL7, Lighthouse, RAMA, Phantasmagoria 2
}

function getSciVersion() {
    // TODO: fix stub
    return SciVersion.SCI_VERSION_0_LATE;
}

function detectLofsType() {
    // TODO: fix stub
    return SciVersion.SCI_VERSION_0_EARLY;
}


var MoveCountType = {
	Uninitialized : 0,
	IgnoreMoveCount : 1,
	IncrementMoveCount : 2
};

var GameFeatures = (function() {
    var moveCountType = MoveCountType.Uninitialized;
    
    var detectMoveCountType = function() {
    	if (moveCountType == MoveCountType.Uninitialized) {
            // SCI0/SCI01 games always increment move count
            if (getSciVersion() <= SciVersion.SCI_VERSION_01) {
                moveCountType = MoveCountType.IncrementMoveCount;
            } else if (getSciVersion() >= SciVersion.SCI_VERSION_1_1) {
                // SCI1.1 and newer games always ignore move count
                moveCountType = MoveCountType.IgnoreMoveCount;
            } else {
                if (!autoDetectMoveCountType()) {
                    Debug.error("Move count autodetection failed");
                    moveCountType = MoveCountType.IncrementMoveCount;	// Most games do this, so best guess
                }
            }
        }
    
        return moveCountType;
    }

    var handleMoveCount = function() {
        return detectMoveCountType() == MoveCountType.IncrementMoveCount;
    }
    
    var usesOldGfxFunctions = function() {
        // TODO
        return false;
    }

    return {
        handleMoveCount : handleMoveCount,
        usesOldGfxFunctions : usesOldGfxFunctions
    }
})();
var Disassembler = {
    disassemble : function(data) {
        var pos = 0;
        var blockIndex = 0;
        
        while(pos < data.getLength()) {
            var blockType = data.getUint16LE(pos);
            
            if(blockType == ScriptObjectTypes.SCI_OBJ_TERMINATOR) {
                break;
            }
           
            var blockSize = data.getUint16LE(pos + 2);
            
            Debug.log("-- 0x" + pos.toString(16) + " Block index: " + blockIndex + " type: " + enumToString(ScriptObjectTypes, blockType) + " size: " + blockSize + " --");

            switch(blockType) {
                case ScriptObjectTypes.SCI_OBJ_CODE:
                    this.disassembleCode(data, pos + 4, pos + blockSize);
                break;
                case ScriptObjectTypes.SCI_OBJ_OBJECT:
                    this.disassembleObject(data, pos + 4, pos + blockSize, blockIndex);
                break;
                case ScriptObjectTypes.SCI_OBJ_EXPORTS:
                    this.disassembleExports(data, pos + 4, pos + blockSize);
                break;
                default:
                break;
            }
            
            pos += blockSize;
            blockIndex ++;
        }
        
        return 0;            
    },

    disassembleExports : function(data, start, end) {
        var pos = start;
        
        var numExports = data.getUint16LE(pos);
        pos += 2;
        Debug.log("Num exports: " + numExports);
        
        for(var e = 0; e<numExports; e++) {
            var addr = data.getUint16LE(pos);
            addr += SCRIPT_OBJECT_MAGIC_OFFSET;
            pos += 2;
            
            Debug.log("- Export " + e + " at address 0x" + addr.toString(16));
        }
    },
    
    disassembleObject : function(data, start, end, index) {
        var pos = start;
        
        Debug.log("- Object " + index + " -");
        
        var magic = data.getUint16LE(pos);
        pos += 2;
        var validMagic = (magic == 0x1234 ? "VALID" : "INVALID");
        Debug.log("Magic number: " + magic.toString(16) + " - " + validMagic);
        
        // ignore local variable offset
        pos += 2;
        
        var funcSelectorOffset = data.getUint16LE(pos);
        pos += 2;
        Debug.log("Function selector list offset: " + funcSelectorOffset);

        var numVarSelectors = data.getUint16LE(pos);
        pos += 2;
        Debug.log("Num variable selectors: " + numVarSelectors);
        
        var species = data.getUint16LE(pos);
        pos += 2;
        Debug.log("Species: 0x" + species.toString(16));
        
        var superClass = data.getUint16LE(pos);
        Debug.log("Super class: 0x" + superClass.toString(16));
        pos += 2;
        
        var infoSelector = data.getUint16LE(pos);
        Debug.log("Info: 0x" + infoSelector.toString(16));
        pos += 2;
        
        var nameSelector = data.getUint16LE(pos);
        Debug.log("Name: 0x" + nameSelector.toString(16));
        pos += 2;
        
        for(var v = 0; v<numVarSelectors - 4; v++) {
            
        }
        
        /*
        [00][01]: Magic number 0x1234
[02][03]: Local variable offset (filled in at run-time)
[04][05]: Offset of the function selector list, relative to its own position
[06][07]: Number of variable selectors (= #vs)
[08][09]: The 'species' selector
[0a][0b]: The 'superClass' selector
[0c][0d]: The '-info-' selector
[0e][0f]: The 'name' selector (object/class name)
[10].@.@.@: (#vs-4) more variable selectors
[08+@ #vs*2][09+@ #vs*2]: Number of function selectors (= #fs)
[0a+@ #vs*2].@.@.@: Selector IDs for the functions
[08+@ #vs*2 +@ #fs*2][09+@ #vs*2 +@ #fs*2]zero
[0a+@ #vs*2 +@ #fs*2].@.@.@: Function selector code pointers*/
        
    },
    
    disassembleCode : function(data, start, end) {
        var pos = start;
        var x = 0;
        var instructionLimit = 10;
        
        while(pos < end && instructionLimit > 0) {
            var op = readVMInstruction(data, pos);
            
            var debugLog = ":" + enumToString(opcode, op.opcode) + " ";
            for(var param = 0; param<op.params.length; param++) {
                debugLog = debugLog + op.params[param];
                if(param + 1 < op.params.length) {
                    debugLog = debugLog + ", ";
                }
            }
            Debug.log(debugLog);
            
            pos += op.offset;
            x++;
            instructionLimit --;
        }
    }
}

var Debug = (function() {
    var enabledChannels = {};

    var enableChannel = function(channel) {
        enabledChannels[channel] = true;
    }
    
    var isChannelEnabled = function(channel) {
        return typeof(enabledChannels[channel]) != 'undefined' && enabledChannels[channel];
    }
    
   // enableChannel("KMisc");
   // enableChannel("Script");
  //  enableChannel("VM");
  //  enableChannel("VMKF");
  //  enableChannel("Branch");
  //  enableChannel("KGraphics");
   // enableChannel("Selector");
   // enableChannel("ScriptObject");

    return {
        log : function(channel, message) {
            if(typeof message == 'undefined') {
                console.log(channel);
            }
            else if(isChannelEnabled(channel)) {
                console.log(message);
            }
        },
        
        warn : function(message) {
            console.warn(message);
        },
        
        error : function(message) {
            console.error(message);
        },
        
        enableChannel : enableChannel
    }
})();

function enumToString(enumObj, value) {
    for(var x in enumObj) {
        if(enumObj[x] == value) {
            return x;
        }
    }
    return "INVALID_ENUM";
}
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

var SegmentType = {
	SEG_TYPE_INVALID : 0,
	SEG_TYPE_SCRIPT : 1,
	SEG_TYPE_CLONES : 2,
	SEG_TYPE_LOCALS : 3,
	SEG_TYPE_STACK : 4,
	// 5 used to be system strings,	now obsolete
	SEG_TYPE_LISTS : 6,
	SEG_TYPE_NODES : 7,
	SEG_TYPE_HUNK : 8,
	SEG_TYPE_DYNMEM : 9
	// 10 used to be string fragments, now obsolete

/*#ifdef ENABLE_SCI32
	SEG_TYPE_ARRAY = 11,
	SEG_TYPE_STRING = 12,
#endif
*/
};

function SegmentRef(data, offset, isRaw) {
    this.data = data;
    this.offset = offset;
    this.isRaw = isRaw;
}

SegmentRef.prototype = {
    getChar : function(x) {
        if(this.isRaw) {
            return this.data[this.offset + x] & 0xFF;
        }
        
        var off = this.offset + x;
        var reg = this.data[off >> 1];
        
        if((off & 0x1) == 0x1) {
            return (reg.offset >> 8) & 0xFF;
        }
        else {
            return reg.offset & 0xFF;
        }
    },
    
    setChar : function(x, val) {
        if(this.isRaw) {
            this.data[this.offset + x] = val & 0xFF;
            return;
        }

        var off = this.offset + x;
        var reg = this.data[off >> 1];
        
        if((off & 0x1) == 0x1) {
            reg.offset = ((val & 0xFF) << 8) | (reg.offset & 0xFF);
        }
        else {
            reg.offset = (val & 0xFF) | (reg.offset & 0xFF00);
        }
    }
};

function LocalVariables() {
    this.segmentType = SegmentType.SEG_TYPE_LOCALS;
    this.scriptID = 0;
    this.locals = [];
}

LocalVariables.prototype = {
    initLocals : function(capacity) {
        this.locals = new Array(capacity);
        for(var i = 0; i<capacity; i++) {
            this.locals[i] = new Reg(0, 0);
        }
    }
};

function Stack(capacity) {
    this.segmentType = SegmentType.SEG_TYPE_STACK;
    this.entries = new Array(capacity);
    
	// SSCI initializes the stack with "S" characters (uppercase S in SCI0-SCI1,
	// lowercase s in SCI0 and SCI11) - probably stands for "stack"
    var filler = "s".charCodeAt(0);
    
    for(var n = 0; n<capacity; n++) {
        this.entries[n] = new Reg(0, filler);
    }
    
    this.capacity = capacity;
}

Stack.prototype = {
    dereference : function(ptr) {
        return new SegmentRef(this.entries, ptr.offset, false);
    }
};

function List() {
    this.first = new Reg(0, 0);
    this.last = new Reg(0, 0);
}

function ListTable() {
    this.segmentType = SegmentType.SEG_TYPE_LISTS;    
    
    this.table = [];
}

ListTable.prototype = {
    allocEntry : function() {
        var entry = new List();
        this.table.push(entry);
        return this.table.length - 1;
    },
    
    isValidEntry : function(offset) {
        return typeof this.table[offset] != 'undefined';
    }
};

function NodeTable() {
    this.segmentType = SegmentType.SEG_TYPE_NODES;    
    
    this.table = [];
}

NodeTable.prototype = {
    allocEntry : function() {
        var entry = new List();
        this.table.push(entry);
        return this.table.length - 1;
    },
    
    isValidEntry : function(offset) {
        return typeof this.table[offset] != 'undefined';
    }
};

function CloneTable() {
    this.segmentType = SegmentType.SEG_TYPE_CLONES;    
    
    this.table = [];
}

CloneTable.prototype = {
    allocEntry : function() {
        var entry = new ScriptObject();
        this.table.push(entry);
        return this.table.length - 1;
    },
    
    isValidEntry : function(offset) {
        return typeof this.table[offset] != 'undefined';
    }
};

function Hunk(type, size) {
    this.type = type;
    this.buf = new BinaryBuffer(size);
}

function HunkTable() {
    this.segmentType = SegmentType.SEG_TYPE_HUNK;    
    
    this.table = [];
}

HunkTable.prototype = {
    allocEntry : function(type, size) {
        var entry = new Hunk(type, size);
        this.table.push(entry);
        return this.table.length - 1;
    },
    
    isValidEntry : function(offset) {
        return typeof this.table[offset] != 'undefined';
    }
};


function DynMem(size) {
    this.segmentType = SegmentType.SEG_TYPE_DYNMEM;
    this.buf = new BinaryBuffer(size);
}

DynMem.prototype = {
    dereference : function(ptr) {
        return new SegmentRef(this.buf.data, ptr.offset, true);
    }
};


var SelectorType = {
	None : 0,
	Variable : 1,
	Method : 2
};

/** Contains selector IDs for a few selected selectors */
var SelectorCache = {
	// Statically defined selectors, (almost the) same in all SCI versions
	_info_ : 0,	///< Removed in SCI3
	y : 0,
	x : 0,
	view : 0, loop : 0, cel : 0, ///< Description of a specific image
	underBits : 0, ///< Used by the graphics subroutines to store backupped BG pic data
	nsTop : 0, nsLeft : 0, nsBottom : 0, nsRight : 0, ///< View boundaries ('now seen')
	lsTop : 0, lsLeft : 0, lsBottom : 0, lsRight : 0, ///< Used by Animate() subfunctions and scroll list controls
	signal : 0, ///< Used by Animate() to control a view's behavior
	illegalBits : 0, ///< Used by CanBeHere
	brTop : 0, brLeft : 0, brBottom : 0, brRight : 0, ///< Bounding Rectangle
	// name, key, time
	text : 0, ///< Used by controls
	elements : 0, ///< Used by SetSynonyms()
	// color, back
	mode : 0, ///< Used by text controls (-> DrawControl())
	// style
	state : 0, font : 0, type : 0,///< Used by controls
	// window
	cursor : 0, ///< Used by EditControl
	max : 0, ///< Used by EditControl, removed in SCI3
	mark : 0, //< Used by list controls (script internal, is needed by us for the QfG import rooms)
	sort : 0, //< Used by list controls (script internal, is needed by us for QfG3 import room)
	// who
	message : 0, ///< Used by GetEvent
	// edit
	play : 42, ///< Play function (first function to be called)
	number : 0,
	handle : 0,	///< Replaced by nodePtr in SCI1+
	nodePtr : 0,	///< Replaces handle in SCI1+
	client : 0, ///< The object that wants to be moved
	dx : 0, dy : 0, ///< Deltas
	b_movCnt : 0, b_i1 : 0, b_i2 : 0, b_di : 0, b_xAxis : 0, b_incr : 0, ///< Various Bresenham vars
	xStep : 0, yStep : 0, ///< BR adjustments
	xLast : 0, yLast : 0, ///< BR last position of client
	moveSpeed : 0, ///< Used for DoBresen
	canBeHere : 0, ///< Funcselector: Checks for movement validity in SCI0
	heading : 0, mover : 0, ///< Used in DoAvoider
	doit : 0, ///< Called (!) by the Animate() system call
	isBlocked : 0, looper : 0,	///< Used in DoAvoider
	priority : 0,
	modifiers : 0, ///< Used by GetEvent
	replay : 0, ///< Replay function
	// setPri, at, next, done, width
	wordFail : 0, syntaxFail : 0, ///< Used by Parse()
	// semanticFail, pragmaFail
	// said
	claimed : 0, ///< Used generally by the event mechanism
	// value, save, restore, title, button, icon, draw
	delete_ : 0, ///< Called by Animate() to dispose a view object
	z : 0,

	// SCI1+ static selectors
	parseLang : 0,
	printLang : 0, ///< Used for i18n
	subtitleLang : 0,
	size : 0,
	points : 0, ///< Used by AvoidPath()
	palette : 0,	///< Used by the SCI0-SCI1.1 animate code, unused in SCI2-SCI2.1, removed in SCI3
	dataInc : 0,	///< Used to sync music with animations, removed in SCI3
	// handle (in SCI1)
	min : 0, ///< SMPTE time format
	sec : 0,
	frame : 0,
	vol : 0,
	pri : 0,
	// perform
	moveDone : 0,	///< used for DoBresen

	// SCI1 selectors which have been moved a bit in SCI1.1, but otherwise static
	cantBeHere : 0, ///< Checks for movement avoidance in SCI1+. Replaces canBeHere
	topString : 0, ///< SCI1 scroll lists use this instead of lsTop. Removed in SCI3
	flags : 0,

	// SCI1+ audio sync related selectors, not static. They're used for lip syncing in
	// CD talkie games
	syncCue : 0, ///< Used by DoSync()
	syncTime : 0,

	// SCI1.1 specific selectors
	scaleSignal : 0, //< Used by kAnimate() for cel scaling (SCI1.1+)
	scaleX : 0, scaleY : 0,	///< SCI1.1 view scaling
	maxScale : 0,		///< SCI1.1 view scaling, limit for cel, when using global scaling
	vanishingX : 0,	///< SCI1.1 view scaling, used by global scaling
	vanishingY : 0,	///< SCI1.1 view scaling, used by global scaling

	// Used for auto detection purposes
	overlay : 0,	///< Used to determine if a game is using old gfx functions or not

	// SCI1.1 Mac icon bar selectors
	iconIndex : 0, ///< Used to index icon bar objects
	select : 0,
};

var selectorNames = [];

function findSelector(name) {
    for(var x in selectorNames) {
        if(selectorNames[x] == name)
            return parseInt(x);
    }
    
    return -1;
}

function mapSelector(internalName, defaultName) {
    if(typeof defaultName == 'undefined') {
        defaultName = internalName;
    }
    
    if(typeof SelectorCache[internalName] == 'undefined') {
        Debug.warn("Selector was not defined: " + internalName);
    }
    
    var selectorId = findSelector(defaultName);
    if(selectorId == -1) {
        //Debug.error("Failed to map selector " + internalName);
    }
    
    Debug.log("Selector", "Mapping selector " + internalName + " to id " + selectorId);
    
    SelectorCache[internalName] = selectorId;
}

function mapSelectors() {
	mapSelector("_info_", "-info-");
	mapSelector("y");
	mapSelector("x");
	mapSelector("view");
	mapSelector("loop");
	mapSelector("cel");
	mapSelector("underBits");
	mapSelector("nsTop");
	mapSelector("nsLeft");
	mapSelector("nsBottom");
	mapSelector("lsTop");
	mapSelector("lsLeft");
	mapSelector("lsBottom");
	mapSelector("lsRight");
	mapSelector("nsRight");
	mapSelector("signal");
	mapSelector("illegalBits");
	mapSelector("brTop");
	mapSelector("brLeft");
	mapSelector("brBottom");
	mapSelector("brRight");
	// name
	// key
	// time
	mapSelector("text");
	mapSelector("elements");
	// color
	// back
	mapSelector("mode");
	// style
	mapSelector("state");
	mapSelector("font");
	mapSelector("type");
	// window
	mapSelector("cursor");
	mapSelector("max");
	mapSelector("mark");
	mapSelector("sort");
	// who
	mapSelector("message");
	// edit
	mapSelector("play");
	mapSelector("number");
	mapSelector("handle");	// nodePtr
	mapSelector("client");
	mapSelector("dx");
	mapSelector("dy");
	mapSelector("b_movCnt", "b-moveCnt");
	mapSelector("b_i1", "b-i1");
	mapSelector("b_i2", "b-i2");
	mapSelector("b_di", "b-di");
	mapSelector("b_xAxis", "b-xAxis");
	mapSelector("b_incr", "b-incr");
	mapSelector("xStep");
	mapSelector("yStep");
	mapSelector("xLast");
	mapSelector("yLast");
	mapSelector("moveSpeed");
	mapSelector("canBeHere");	// cantBeHere
	mapSelector("heading");
	mapSelector("mover");
	mapSelector("doit");
	mapSelector("isBlocked");
	mapSelector("looper");
	mapSelector("priority");
	mapSelector("modifiers");
	mapSelector("replay");
	// setPri
	// at
	// next
	// done
	// width
	mapSelector("wordFail");
	mapSelector("syntaxFail");
	// semanticFail
	// pragmaFail
	// said
	mapSelector("claimed");
	// value
	// save
	// restore
	// title
	// button
	// icon
	// draw
	mapSelector("delete_", "delete");
	mapSelector("z");
	// -----------------------------
	mapSelector("size");
	mapSelector("moveDone");
	mapSelector("vol");
	mapSelector("pri");
	mapSelector("min");
	mapSelector("sec");
	mapSelector("frame");
	mapSelector("dataInc");
	mapSelector("palette");
	mapSelector("cantBeHere");
	mapSelector("nodePtr");
	mapSelector("flags");
	mapSelector("points");
	mapSelector("syncCue");
	mapSelector("syncTime");
	mapSelector("printLang");
	mapSelector("subtitleLang");
	mapSelector("parseLang");
	mapSelector("overlay");
	mapSelector("topString");
	mapSelector("scaleSignal");
	mapSelector("scaleX");
	mapSelector("scaleY");
	mapSelector("maxScale");
	mapSelector("vanishingX");
	mapSelector("vanishingY");
	mapSelector("iconIndex");
	mapSelector("select");
}

function loadSelectorNames() {
    ResourceManager.loadResource("vocab." + VocabResource.SELECTORS + ".b64", function(selectorData) {
        // Temporary hack!
        selectorData.data = selectorData.data.slice(2);

    	var oldScriptHeader = (getSciVersion() == SciVersion.SCI_VERSION_0_EARLY);
    	
    	var count = selectorData.getUint16LE(0) + 1;

        selectorNames = [];
    	
    	for(var i = 0; i<count; i++) {
    	    var offset = selectorData.getUint16LE(2 + i * 2);
    	    var len = selectorData.getUint16LE(offset);
    	    
    	    var str = "";
    	    for(var n = 0; n<len; n++) {
    	        str = str + String.fromCharCode(selectorData.getByte(offset + 2 + n));
    	    }
    	    
    	    selectorNames.push(str);
    	    
            // Early SCI versions used the LSB in the selector ID as a read/write
            // toggle. To compensate for that, we add every selector name twice.
    	    if(oldScriptHeader)
    	        selectorNames.push(str);
    	}
    	
    	mapSelectors();
    	
//        selectorData.hexdump();
    });
}

function readSelectorValueSigned(object, selectorId) {
    return readSelector(object, selectorId).toSint16();
}
function readSelectorValue(object, selectorId) {
    return readSelector(object, selectorId).offset;
}
function readSelector(object, selectorId) {
	var address = new ObjVarRef();

	if (lookupSelector(object, selectorId, address, null) != SelectorType.Variable)
		return new Reg(0, 0);
	else
		return address.getPointer().clone();
}

function writeSelectorValue(object, selectorId, value) {
    return writeSelector(object, selectorId, new Reg(0, value));
}
function writeSelector(object, selectorId, value) {
	var address = new ObjVarRef();

	if ((selectorId < 0) || (selectorId > selectorNames.length)) {
		Debug.error("Attempt to write to invalid selector " + selectId + " of object at " + object);
		return;
	}

	if (lookupSelector(object, selectorId, address, null) != SelectorType.Variable)
 		Debug.error("Selector '" + getSelectorName(selectorId) + "' of object at " + object + "could not be written to");
	else {
		address.getPointer().set(value);
    }
}

function invokeSelector(object, selectorId, k_argc, k_argp, args) {
	var i;
	var framesize = 2 + 1 * args.length;
	var slc_type;
	var stackframe = k_argp + k_argc;

    VM.state.stack[stackframe] = new Reg(0, selectorId);    // The selector we want to call
    VM.state.stack[stackframe + 1] = new Reg(0, args.length);  // Argument count
    
	slc_type = lookupSelector(object, selectorId, null, null);

	if (slc_type == SelectorType.None) {
		Debug.error("Selector " + getSelectorName(selectorId) + " of object at " + object + " could not be invoked");
	}
	if (slc_type == SelectorType.Variable) {
		Debug.error("Attempting to invoke variable selector " + getSelectorName(selectorId) + " of object " + object);
	}

	for (var i = 0; i < args.length; i++)
		VM.state.stack[stackframe + 2 + i].set(args[i]); // Write each argument

	// Now commit the actual function:
	var xstack = sendSelector(object, object, stackframe, framesize, stackframe);

	xstack.sp += args.length + 2;
	xstack.fp += args.length + 2;

	VM.run(); // Start a new vm
}


function lookupSelector(obj_location, selectorId, varp, fptr) {
	var obj = SegManager.getObject(obj_location);
	var index;
    var oldScriptHeader = (getSciVersion() == SciVersion.SCI_VERSION_0_EARLY);

	// Early SCI versions used the LSB in the selector ID as a read/write
	// toggle, meaning that we must remove it for selector lookup.
	if (oldScriptHeader)
		selectorId &= ~1;

	if (obj == null) {
		Debug.error("lookupSelector(): Attempt to send to non-object or invalid script. Address was " + obj_location);
	}

	index = obj.locateVarSelector(selectorId);

	if (index >= 0) {
		// Found it as a variable
		if (varp != null) {
			varp.obj = obj_location;
			varp.varIndex = index;
		}
		return SelectorType.Variable;
	} else {
		// Check if it's a method, with recursive lookup in superclasses
		while (obj != null) {
			index = obj.funcSelectorPosition(selectorId);
			if (index >= 0) {
				if (fptr != null)
					fptr.set(obj.getFunction(index));

				return SelectorType.Method;
			} else {
				obj = SegManager.getObject(obj.getSuperClassSelector());
			}
		}

        // Debug
        obj = SegManager.getObject(obj_location);
    	index = obj.locateVarSelector(selectorId);
    	//
    	
		return SelectorType.None;
	}
}

var CALL_SP_CARRY = 0xFFFF;

function sendSelector(send_obj, work_obj, sp, framesize, argp) {
	// send_obj and work_obj are equal for anything but 'super'
	// Returns a pointer to the TOS exec_stack element
	var funcp = new Reg(0, 0);
	var selector;
	var argc;
	var origin = VM.state.executionStack.length - 1; // Origin: Used for debugging
    var varp = new ObjVarRef();

    var prevElementIterator = VM.state.executionStack.length;

	while (framesize > 0) {
		selector = VM.state.stack[argp].requireUint16();
		argp++;
		argc = VM.state.stack[argp].requireUint16();

		if (argc > 0x800)	// More arguments than the stack could possibly accomodate for
			Debug.error("sendSelector(): More than 0x800 arguments to function call");

		var selectorType = lookupSelector(send_obj, selector, varp, funcp);
		if (selectorType == SelectorType.None)
			Debug.error("Send to invalid selector " + (0xffff & selector) + " of object at " + send_obj);

		var stackType = ExecStackType.EXEC_STACK_TYPE_VARSELECTOR;
		var curSP = 0;
		var curFP = new Reg(0, 0); //NULL_REG
		
		if (selectorType == SelectorType.Method) {
			stackType = ExecStackType.EXEC_STACK_TYPE_CALL;
			curSP = sp;
			curFP = funcp;
			sp = CALL_SP_CARRY; // Destroy sp, as it will be carried over
		}

		var xstack = new ExecStack(work_obj, send_obj, curSP, argc, argp,
							0xFFFF, curFP, selector, -1, -1,
							origin, stackType);

		if (selectorType == SelectorType.Variable) {
			xstack.varp = varp.clone();
			xstack.pc = varp.obj;
		}

		// The new stack entries should be put on the stack in reverse order
		// so that the first one is executed first
		VM.state.executionStack.splice(prevElementIterator, 0, xstack);
		// Decrement the stack end pointer so that it points to our recently
		// added element, so that the next insert() places it before this one.
		//--prevElementIterator;

		framesize -= (2 + argc);
		argp += argc + 1;
	}	// while (framesize > 0)

	execVarSelectors();

	return VM.state.executionStack.length == 0 ? null : VM.state.executionStack[VM.state.executionStack.length - 1];
}

function execVarSelectors() {
	// Executes all varselector read/write ops on the TOS
	while (VM.state.executionStack.length > 0 && VM.state.executionStack[VM.state.executionStack.length - 1].type == ExecStackType.EXEC_STACK_TYPE_VARSELECTOR) {
		var xs = VM.state.executionStack[VM.state.executionStack.length - 1];
		
		var varPtr = xs.getVarPointer();
		if (varPtr == null) {
			Debug.error("Invalid varselector exec stack entry");
		} else {
			// varselector access?
			if (xs.argc > 0) { // write?
			    Debug.log("Selector", "Writing " + VM.state.stack[xs.variablesArgp + 1].toString() + " ; prev value = " + varPtr.toString());
				varPtr.set(VM.state.stack[xs.variablesArgp + 1]);

			} else // No, read
				VM.state.acc.set(varPtr);
		}
		VM.state.executionStack.pop();
	}
}

var ScriptLoadType = {
	SCRIPT_GET_DONT_LOAD : 0, /**< Fail if not loaded */
	SCRIPT_GET_LOAD : 1, /**< Load, if neccessary */
	SCRIPT_GET_LOCK : 3 /**< Load, if neccessary, and lock */
};

var VM_LOAD_STALL = "VM_LOAD_STALL";

function ScriptClass() {
    this.scriptNum = 0;
    this.reg = new Reg(0, 0);
}

var SegManager = (function() {
    var heap = [];
    var classTable = [];
    var scriptSegMap = {};
    
    var listsSegment = 0;
    var nodesSegment = 0;
    var clonesSegId = 0;
    
    var saveDirPtr = null;
    var parserPtr = null;
    
    var init = function() {
        ResourceManager.loadResource("vocab.996.b64", function(resourceData) {
            createClassTable(resourceData);
        });
    }
    
    var initSysStrings = function() {
        if (getSciVersion() <= SciVersion.SCI_VERSION_1_1) {
            // We need to allocate system strings in one segment, for compatibility reasons
            saveDirPtr = allocDynmem(512, "system strings");
            parserPtr = new Reg(saveDirPtr.segment, saveDirPtr.offset + 256);
        }
    }
    
    var getSaveDirPtr = function() {
        return saveDirPtr;
    }
    
    var findFreeSegment = function() {
        return heap.length;
    }
    
    var allocDynmem = function(size, description) {
        var mobj = new DynMem(size);
        var seg = allocSegment(mobj);
        
        var addr = new Reg(seg, 0);
    
        mobj.description = description;
    
        return addr;
    }
    
    var allocSegment = function(mem) {
        var id = findFreeSegment();
        heap[id] = mem;
        mem.segmentId = id;
        return id;
    }
    
    var allocScript = function(script) {
        if(typeof scriptSegMap[script.scriptNum] != 'undefined') {
            var id = scriptSegMap[script.scriptNum];
            return id;
        }
        else {
            var id = allocSegment(script);
            scriptSegMap[script.scriptNum] = id;
            return id;
        }
    }
    
    var allocStack = function(capacity) {
        var stack = new Stack(capacity);
        var id = allocSegment(stack);
        return stack.entries;
    }
    
    var allocList = function(addr) {
        var table;
        
        if(listsSegment == 0) {
            table = new ListTable();
            listsSegment = allocSegment(table);
        }
        else
            table = heap[listsSegment];
            
        var offset = table.allocEntry();
        addr.set(new Reg(listsSegment, offset));
        
        return table.table[offset];
    }
    
    var allocNode = function(addr) {
        var table;
        var offset;
    
        if (nodesSegment == 0) {
            table = new NodeTable();
            nodesSegment = allocSegment(table);
        }
        else
            table = heap[nodesSegment];
    
        offset = table.allocEntry();
    
        addr.segment = nodesSegment;
        addr.offset = offset;
        return table.table[offset];
    }

    var allocHunk = function(type, size) {
        var table;
        var offset;
    
        if (hunkSegment == 0) {
            table = new HunkTable();
            hunkSegment = allocSegment(table);
        }
        else
            table = heap[hunkSegment];
    
        offset = table.allocEntry(type, size);
    
        return new Reg(hunkSegment, offset);
    }
    
    var allocClone = function(addr) {
        var table;
        var offset;
    
        if (clonesSegId == 0) {
            table = new CloneTable();
            clonesSegId = allocSegment(table);
        }
        else
            table = heap[clonesSegId];
    
        offset = table.allocEntry();
    
        addr.segment = clonesSegId;
        addr.offset = offset;
        return table.table[offset];
    }
    
    var getScriptSegment = function(scriptNum) {
        return scriptSegMap[scriptNum];
    }
    
    var getScriptFromSegment = function(segmentId) {
        var scr = getSegmentObj(segmentId);
        if(scr.segmentType == SegmentType.SEG_TYPE_SCRIPT)
            return scr;
        else return null;
    }
    
    var isScriptLoaded = function(scriptNum) {
        return (typeof scriptSegMap[scriptNum] != 'undefined');
    }
    
    var getSegmentObj = function(segment) {
        if(typeof(heap[segment]) == 'undefined') {
            Debug.error("No valid segment at index " + segment);
            return null;
        }
        return heap[segment];
    }
    
    var getSegment = function(segment, type) {
        var segObj = getSegmentObj(segment);
        if(segObj != null && segObj.segmentType == type) {
            return segObj;
        }
        return null;
    }
    
    var getSegmentType = function(segment) {
        if(typeof heap[segment] != 'undefined')
            return heap[segment].segmentType;   
        else return null;
    }
    
    var getObject = function(pos) {
        var obj = null;
        var mobj = getSegmentObj(pos.segment);

        if (mobj != null) {
            if (mobj.segmentType == SegmentType.SEG_TYPE_CLONES) {
                var ct = mobj;
                if (ct.isValidEntry(pos.offset))
                    obj = ct.table[pos.offset];
                else
                    Debug.warning("getObject(): Trying to get an invalid object");
            } 
            else if (mobj.segmentType == SegmentType.SEG_TYPE_SCRIPT) {
                var scr = mobj;
                if (pos.offset <= scr.buf.getLength() && pos.offset >= -SCRIPT_OBJECT_MAGIC_OFFSET
                        && scr.isObject(pos.offset)) {
                    obj = scr.getObject(pos.offset);
                }
            }
        }

    	return obj;
    }

    var createClassTable = function(vocab996) {
        /*Resource *vocab996 = _resMan->findResource(ResourceId(kResourceTypeVocab, 996), 1);
    
        if (!vocab996)
            error("SegManager: failed to open vocab 996");
    
        int totalClasses = vocab996->size >> 2;
        _classTable.resize(totalClasses);
    
        for (uint16 classNr = 0; classNr < totalClasses; classNr++) {
            uint16 scriptNr = READ_SCI11ENDIAN_UINT16(vocab996->data + classNr * 4 + 2);
    
            _classTable[classNr].reg = NULL_REG;
            _classTable[classNr].scriptNum = scriptNr;
        }
    
        _resMan->unlockResource(vocab996);*/
        
        var totalClasses = vocab996.getLength() >> 2;
        classTable = new Array(totalClasses);
        
        //vocab996.hexdump();
        
        for(var classNr = 0; classNr < totalClasses; classNr++) {
            var scriptNr = vocab996.getUint16LE(classNr * 4 + 4);
        
            classTable[classNr] = new ScriptClass();
            classTable[classNr].reg = new Reg(0, 0);
            classTable[classNr].scriptNum = scriptNr;
//            Debug.log("Class " + classNr + " requires script " + scriptNr);
        }
        
    }
    
    var getClassOwner = function(classNr) {
        return classTable[classNr].scriptNum;
    }
    
    var setClassOffset = function(index, offset) {
        classTable[index].reg = offset;
        Debug.log("SegManager", "Updating class table: Class " + index.toString() + " set to script " + classTable[index].scriptNum + " address " + offset.toString());
    }
    
    var getClassAddress = function(classnr, lock, caller) {
        if (classnr == 0xffff)
            return new Reg(0, 0);
    
        if (classnr < 0 || classTable.length <= classnr || classTable[classnr].scriptNum < 0) {
            Debug.error("[VM] Attempt to dereference class " + classnr + "which doesn't exist max = " + classTable.length);
            return new Reg(0, 0);
        } 
        else {
            Debug.log("SegManager", "getClassAddress() on class " + classnr);
            
            var cl = classTable[classnr];
            if (cl.reg.segment == 0) {
                var script = heap[scriptSegMap[cl.scriptNum]];
                
                if(script == null || typeof script == 'undefined')
                {
                    ResourceManager.loadScript(cl.scriptNum, true);
                    throw VM_LOAD_STALL;
                    Debug.error("Script not loaded: " + cl.scriptNum);
                }
                
                script.init();
                
                //getScriptSegment(the_class->script, lock); ?
    
                if (cl.reg.segment == 0) {
                    Debug.error("[VM] Trying to instantiate class " + classnr + " by instantiating script " + cl.scriptNum);
                    return new Reg(0, 0);
                }
            } 
            else {
                if (caller.segment != cl.reg.segment) {
                    //getScript(the_class->reg.segment)->incrementLockers();
                }
            }
            
            return cl.reg.clone();
        }
    }
    
    var findSegmentByType = function(segmentType) {
        for(var x in heap) {
            if(heap[x].segmentType == segmentType)
                return parseInt(x);
        }
        return null;
    }
    
    var dereference = function(addr) {
        if(typeof addr == 'string') {
            return new StringPtr(addr);
        }
    
        var mobj = heap[addr.segment];
        
        if(typeof mobj != 'undefined' && typeof mobj.dereference == 'function')
            return mobj.dereference(addr);
            
        return null;
    }
    
    var derefString = function(addr) {
        var ptr = dereference(addr);
        
        if(ptr != null) {
            var str = "";
            var x = 0;
            
            while(x < 255) {
                var read = ptr.getChar(x++);
                if(read == 0)
                    return str;
                    
                str = str + String.fromCharCode(read);
            }
            
        }
        
        return null;
    }
    
    var getString = function(pointer, entries) {
        if(typeof entries == 'undefined')
            entries = 0;
            
        var ret = "";
        if (pointer.isNull())
            return ret;	// empty text
    
        var src_r = dereference(pointer);
        if (entries > src_r.data.length) {
            Debug.warn("Trying to dereference pointer " + pointer.toString() + " beyond end of segment");
            return ret;
        }

        for(var x = 0; x<src_r.data.length; x++) { 
            var c = src_r.getChar(x);
            
            if(c == 0)
                break;
            else {
                ret += String.fromCharCode(c);
            }
        }
        return ret;
    }
    
    var getObjectName = function(pos) {
        var obj = getObject(pos);
        if (obj == null)
            return "<no such object>";
    
        var nameReg = obj.getNameSelector();
        if (nameReg.isNull())
            return "<no name>";
    
        var name = null;
        if (nameReg.segment)
            name = derefString(nameReg);
        if (name == null)
            return "<invalid name>";
    
        return name;
    }
    
    var findObjectByName = function(name, index) {
        if(typeof index == 'undefined')
            index = -1;
            
        var result = [];
        
        // Now all values are available; iterate over all objects.
        for(i in heap) {
            var mobj = heap[i];
    
            if (mobj == null)
                continue;
    
            var objpos = new Reg(parseInt(i), 0);
    
            if (mobj.segmentType == SegmentType.SEG_TYPE_SCRIPT) {
                // It's a script, scan all objects in it
                var scr = mobj;
                
                for(o in scr.objects) {
                    objpos.offset = scr.objects[o].pos.offset;
                    var objName = getObjectName(objpos);
                    if(name == objName)
                        result.push(objpos);
                }
            } else if (mobj.segmentType == SegmentType.SEG_TYPE_CLONES) {
                // It's clone table, scan all objects in it
                var ct = mobj;
                for (var idx = 0; idx < ct.table.length; ++idx) {
                    if (!ct.isValidEntry(idx))
                        continue;
    
                    objpos.offset = idx;
                    if (name == getObjectName(objpos))
                        result.push(objpos);
                }
            }
        }
    
        if (result.length == 0)
            return new Reg(0, 0);
    
        if (result.length > 1 && index < 0) {
            Debug.error("findObjectByName(): multiple matches:");
            return new Reg(0, 0); // Ambiguous
        }
    
        if (index < 0)
            return result[0];
        else if (result.length <= index)
            return new Reg(0, 0); // Not found
        return result[index];

    }
    
    var lookupList = function(addr) {
        if (getSegmentType(addr.segment) != SegmentType.SEG_TYPE_LISTS) {
            Debug.error("Attempt to use as list: " + addr.toString());
            return null;
        }
    
        var lt = heap[addr.segment];
    
        if (!lt.isValidEntry(addr.offset)) {
            Debug.error("Attempt to use as list" + addr.toString());
            return null;
        }
    
        return lt.table[addr.offset];
    }
    
    var lookupNode = function(addr, stopOnDiscarded) {
        if(typeof stopOnDiscarded == 'undefined')
            stopOnDiscarded = true;
    
        if (addr.isNull())
            return null; // Non-error null
    
        var type = getSegmentType(addr.segment);
    
        if (type != SegmentType.SEG_TYPE_NODES) {
            Debug.error("Attempt to use non-node " + addr.toString() + "as list node");
            return null;
        }
    
        var nt = heap[addr.segment];
    
        if (!nt.isValidEntry(addr.offset)) {
            if (!stopOnDiscarded)
                return null;
    
            error("Attempt to use invalid or discarded reference " + addr.toString() + " as list node");
            return null;
        }
    
        return nt.table[addr.offset];
    }    
    
    var newNode = function(value, key) {
        var nodeRef = new Reg(0, 0);
        var n = allocNode(nodeRef);
        n.pred = new Reg(0, 0);
        n.succ = new Reg(0, 0);
        n.key = key;
        n.value = value;
    
        return nodeRef;
    }
    
    var strlen = function(addr) {
        if(typeof addr == "string") {
            return addr.length;
        }
    
        var ptr = dereference(addr);
        if(ptr == null)
            return 0;
        
        var length = 0;
        
        while(length < 0xFFFF) {
            var read = ptr.getChar(length);
            
            if(read == 0)
                return length;
            
            length ++;
        }
        
        Debug.error("Error getting length of string at address " + addr.toString());
        
        return 0;
    }
    
    var strcpy = function(dest, src) {
        var length = strlen(src);
        memcpy(dest, src, length);
        
        var ptr = dereference(dest);
        ptr.setChar(length + 1, 0);
    }
    
    var memcpy = function(dest, src, size) {
        var destPtr = dereference(dest);
        var srcPtr = dereference(src);
        
        if(destPtr == null || srcPtr == null) {
            Debug.error("memcpy: Error dereferencing src/dest addresses");
        }
        
        for(var i = 0; i<size; i++) {
            var read = srcPtr.getChar(i);
            destPtr.setChar(i, read);
        }
    }
    
    var isHeapObject = function(pos) {
        var obj = getObject(pos);
        
        return obj != null;
    }

    return {
        init : init,
        initSysStrings : initSysStrings,
        getClassAddress : getClassAddress,
        setClassOffset : setClassOffset,
        getClassOwner : getClassOwner,
        getScriptSegment : getScriptSegment,
        getScriptFromSegment : getScriptFromSegment,
        isScriptLoaded : isScriptLoaded,
        getObject : getObject,
        findObjectByName : findObjectByName,
        getSegment : getSegment,
        getSegmentObj : getSegmentObj,
        findSegmentByType : findSegmentByType,
        allocScript : allocScript,
        allocSegment : allocSegment,
        allocStack : allocStack,
        allocList : allocList,
        allocNode : allocNode,
        allocHunk : allocHunk,
        allocClone : allocClone,
        allocDynmem : allocDynmem,
        lookupList : lookupList,
        lookupNode : lookupNode,
        newNode : newNode,
        getSaveDirPtr : getSaveDirPtr,
        
        isHeapObject : isHeapObject,
        
        dereference : dereference,
        derefString : derefString,
        getString : getString,
        
        memcpy : memcpy,
        strcpy : strcpy,
        strlen : strlen
    };
})();

function relocateBlock(block, blockLocation, segment, location, scriptSize) {
        var rel = location - blockLocation;
    
        if (rel < 0)
            return false;
    
        var idx = rel >> 1;
    
        if (idx >= block.length)
            return false;
    
        if (rel & 1) {
            Debug.error("Attempt to relocate odd variable " + idx + "(relative to " + blockLocation + ")");
            return false;
        }
        block[idx].segment = segment; // Perform relocation
        if (getSciVersion() >= SciVersion.SCI_VERSION_1_1 && getSciVersion() <= SciVersion.SCI_VERSION_2_1)
            block[idx].offset += scriptSize;
    
        return true;
    }
    
var ViewScaleSignals = {
	DoScaling				: 0x0001, // enables scaling when drawing that cel (involves scaleX and scaleY)
	GlobalScaling			: 0x0002, // means that global scaling shall get applied on that cel (sets scaleX/scaleY)
	Hoyle4SpecialHandling	: 0x0004  // HOYLE4-exclusive: special handling inside kAnimate, is used when giving out cards
};

function View(image, data) {
    this.image = image;
    this.data = data;
    this.adjustForSci0Early = getSciVersion() == SciVersion.SCI_VERSION_0_EARLY ? -1 : 0;
    
    Debug.log(this.data);
}

View.prototype = {
    isScaleable : function() { return false; },
    isSci2Hires : function() { return false; },
    
/*    draw : function(loopNo, celNo, celRect, priority, paletteNo, scaleX, scaleY) {
        var celInfo = this.getCelInfo(loopNo, celNo);
//        Screen.getContext().drawImage(this.image, celInfo.x, celInfo.y, celInfo.w, celInfo.h, 20, 20, celInfo.w, celInfo.h);
        GfxScreen.getViewLayer(priority).context.drawImage(this.image, celInfo.x, celInfo.y, celInfo.w, celInfo.h, celRect.left, celRect.top, celInfo.w, celInfo.h);
    },*/

    draw : function(loopNo, celNo, x, y, priority) {
        var celInfo = this.getCelInfo(loopNo, celNo);
//        Screen.getContext().drawImage(this.image, celInfo.x, celInfo.y, celInfo.w, celInfo.h, 20, 20, celInfo.w, celInfo.h);
//        GfxScreen.getViewLayer(priority).context.drawImage(this.image, celInfo.x, celInfo.y, celInfo.w, celInfo.h, x, y, celInfo.w, celInfo.h);
        Screen.getContext().drawImage(this.image, celInfo.x, celInfo.y, celInfo.w, celInfo.h, x, y, celInfo.w, celInfo.h);
    },
    
    getLoopCount : function() {
        return this.data.groups.length;
    },
    
    getCelCount : function(loopNo) {
        return this.data.groups[loopNo].cells.length;
    },
    
    getCelInfo : function(loopNo, celNo) {
        if(loopNo >= this.data.groups.length) {
            loopNo = this.data.groups.length - 1;
        }
        if(celNo >= this.data.groups[loopNo].cells.length) {
            celNo = this.data.groups[loopNo].cells.length - 1;
        }
    
        return this.data.groups[loopNo].cells[celNo];
    },
    
    getNumCels : function(loopNo) {
        return this.data.groups[loopNo].cells.length;
    },
    
    getCelRect : function(loopNo, celNo, x, y, z, outRect) {
        var celInfo = this.getCelInfo(loopNo, celNo);
        outRect.left = x + celInfo.offX - (celInfo.w >> 1);
        outRect.right = outRect.left + celInfo.w;
        outRect.bottom = y + celInfo.offY - z + 1 + this.adjustForSci0Early;
        outRect.top = outRect.bottom - celInfo.h;
    }
}

var SCI_TEXT16_ALIGNMENT_RIGHT = -1
var SCI_TEXT16_ALIGNMENT_CENTER = 1
var SCI_TEXT16_ALIGNMENT_LEFT = 0

function Font(image, data) {
    this.image = image;
    this.data = data;
}

Font.prototype = {
    drawString : function(string, x, y) {
        for(var c = 0; c<string.length; c++) {
            
        }
    }
};

var GfxText = (function() {
    var font = null;

    function init() {
        
    }
    
    function getFontId() {
    	return GfxPorts.getPort().fontId;
    }
    
    function getFont() {
    }
    
    function setFont(fontId) {
    }

	function codeProcessing(text, orgFontId, orgPenColor, doingDrawing) {
	}

	function clearChar(chr) {
	}

	function getLongest(text, maxWidth, orgFontId) {
	}
	
	function width(text, from, len, orgFontId, textWidth, textHeight, restoreFont) {
	}
	
	function stringWidth(str, orgFontId, textWidth, textHeight) {
	}
	
	function showString(str, orgFontId, orgPenColor) {}
	function drawString(str, orgFontId, orgPenColor) {}
	function size(rect, text, fontId, maxWidth) {}
	function draw(text, from, len, orgFontId, orgPenColor) {}
	function show(text, from, len, orgFontId, orgPenColor) {}
	function box(text, show, rect, alignment, fontId) {}
	function drawString(text) {}
	function drawStatus(text) {}

	function allocAndFillReferenceRectArray() {}

	function kernelTextSize(text, font, maxWidth, textWidth, textHeight) {}
	function kernelTextFonts(args) {}
	function kernelTextColors(args) {}
    

    return {
        init : init,
        getFontId : getFontId,
        setFont : setFont
    };
})();
var currentCursor = null;

function Cursor(image, data) {
    this.image = image;
    this.data = data;
}

function kSetCursor(args) {
//    console.log("Setting cursor");
    if(args[1].offset != 0) {
        currentCursor = ResourceManager.loadCursor(args[0].offset);
        
        if(currentCursor == null) {
            throw VM_LOAD_STALL;
        }
    }
    else currentCursor = null;
    
    return VM.state.acc;
}
// window styles
var WindowStyle = {
	TRANSPARENT : (1 << 0),
	NOFRAME     : (1 << 1),
	TITLE       : (1 << 2),
	TOPMOST     : (1 << 3),
	USER        : (1 << 7)
};

var PORTS_FIRSTWINDOWID = 2;
var PORTS_FIRSTSCRIPTWINDOWID = 3;

function Port(id) {
	this.id = id;
	this.top = 0;
	this.left = 0;
	this.rect = new Rect();
	this.curTop = 0;
	this.curLeft = 0;
	this.fontHeight = 0;
	this.fontId = 0;
	this.greyedOutput = false;
	this.penClr = 0;
	this.backClr = 0xFF;
	this.penMode = 0;
	this.counterTillFree = 0;
};

Port.prototype = {
	isWindow : function() { return this.id >= PORTS_FIRSTWINDOWID && this.id != 0xFFFF; }
}

function Window(id) {
    var win = new Port(id);
    
    win.dims = new Rect();
    win.restoreRect = new Rect();
    win.wndStyle = 0;
    win.saveScreenMask = 0;
    win.hSaved1 = new Reg(0, 0);
    win.hSaved2 = new Reg(0, 0);
    win.title = "";
    win.drawn = false;
    return win;
}

var GfxPorts = (function() {
    // public
    var wmgrPort;
	var picWind;

	var menuPort;
	var menuBarRect;
	var menuRect;
	var menuLine;
	var curPort;    
    
    // private
    var windowList = [];

	/** The list of all open 'windows' (and ports), ordered by their id. */
	var windowsById = [];

	var usesOldGfxFunctions;

	var styleUser;

	// counts windows that got disposed but are not freed yet
	var freeCounter;

	var bounds = new Rect();

	// Priority Bands related variables
	var priorityTop, priorityBottom, priorityBandCount;
	var priorityBands = new Array(200);


	function reset() {}
	
	function kernelSetActive(portId) {}
	function kernelGetPicWindow(picTop, picLeft) {}
	function kernelSetPicWindow(rect, picTop, picLeft, initPriorityBandsFlag) {}
	function kernelGetActive() {}
	function kernelNewWindow(dims, restoreRect, style, priority, colorPen, colorBack, title) {}
	function kernelDisposeWindow(windowId, reanimate) {}

	function isFrontWindow(wnd) {}
	function beginUpdate(wnd) {}
	function endUpdate(wnd) {}
	
	function addWindow(dims, restoreRect, title, style, priority, draw) {
        var id = PORTS_FIRSTWINDOWID;
        while (id < windowsById.length && windowsById[id] != null) {
            if (windowsById[id].counterTillFree) {
                // port that is already disposed, but not freed yet
                freeWindow(windowsById[id]);
                freeCounter--;
                break; // reuse the handle
                // we do this especially for sq4cd. it creates and disposes the
                //  inventory window all the time, but reuses old handles as well
                //  this worked somewhat under the original interpreter, because
                //  it put the new window where the old was.
            }
            ++id;
        }
        
        if (id == windowsById.length)
            windowsById.push(null);
        
        var pwnd = new Window(id);
        var r = new Rect();
    
        windowsById[id] = pwnd;
    
        // KQ1sci, KQ4, iceman, QfG2 always add windows to the back of the list.
        // KQ5CD checks style.
        // Hoyle3-demo also always adds to the back (#3036763).
        var forceToBack = (getSciVersion() <= SciVersion.SCI_VERSION_1_EGA_ONLY);
//                           (g_sci->getGameId() == GID_HOYLE3 && g_sci->isDemo());
    
        if (!forceToBack && (style & WindowStyle.TOPMOST))
            windowList.unshift(pwnd);
        else
            windowList.push(pwnd);
        openPort(pwnd);
    
        r = dims.clone();
        // This looks fishy, but it's exactly what Sierra did. They removed last
        // bit of the left dimension in their interpreter. It seems Sierra did it
        // for EGA byte alignment (EGA uses 1 byte for 2 pixels) and left it in
        // their interpreter even in the newer VGA games.
        r.left = r.left & 0xFFFE;
    
        if (r.width() > Screen.width) {
            // We get invalid dimensions at least at the end of sq3 (script bug!).
            // Same happens very often in lsl5, sierra sci didnt fix it but it looked awful.
            // Also happens frequently in the demo of GK1.
            Debug.warn("Fixing too large window, left: " + dims.left + " right: "  + dims.right);
            r.left = 0;
            r.right = Screen.width - 1;
            if ((style != styleUser) && !(style & WindowStyle.NOFRAME))
                r.right--;
        }
        pwnd.rect = r.clone();
        if (restoreRect != null)
            pwnd.restoreRect = restoreRect.clone();
    
        pwnd.wndStyle = style;
        pwnd.hSaved1 = new Reg(0, 0);
        pwnd.hSaved2 = new Reg(0, 0);
        pwnd.drawn = false;
        if ((style & WindowStyle.TRANSPARENT) == 0)
            pwnd.saveScreenMask = (priority == -1 ? GfxScreenMasks.VISUAL : GfxScreenMasks.VISUAL | GfxScreenMasks.PRIORITY);
    
        if (title && (style & WindowStyle.TITLE)) {
            pwnd.title = title;
        }
    
        r = pwnd.rect.clone();
        if ((style != styleUser) && !(style & WindowStyle.NOFRAME)) {
            r.grow(1);
            if (style & WindowStyle.TITLE) {
                r.top -= 10;
                r.bottom++;
            }
        }
    
        pwnd.dims = r.clone();
    
        // Clip window, if needed
        var wmprect = new Rect();
        
        wmprect = wmgrPort.rect.clone();
        // Handle a special case for Dr. Brain 1 Mac. When hovering the mouse cursor
        // over the status line on top, the game scripts try to draw the game's icon
        // bar above the current port, by specifying a negative window top, so that
        // the end result will be drawn 10 pixels above the current port. This is a
        // hack by Sierra, and is only limited to user style windows. Normally, we
        // should not clip, same as what Sierra does. However, this will result in
        // having invalid rectangles with negative coordinates. For this reason, we
        // adjust the containing rectangle instead.
        /*if (pwnd->dims.top < 0 && g_sci->getPlatform() == Common::kPlatformMacintosh &&
            (style & WindowStyle.USER) && _wmgrPort->top + pwnd->dims.top >= 0) {
            // Offset the final rect top by the requested pixels
            wmprect.top += pwnd->dims.top;
        }*/
    
        var oldtop = pwnd.dims.top;
        var oldleft = pwnd.dims.left;
    
        if (wmprect.top > pwnd.dims.top)
            pwnd.dims.moveTo(pwnd.dims.left, wmprect.top);
    
        if (wmprect.bottom < pwnd.dims.bottom)
            pwnd.dims.moveTo(pwnd.dims.left, wmprect.bottom - pwnd.dims.bottom + pwnd.dims.top);
    
        if (wmprect.right < pwnd.dims.right)
            pwnd.dims.moveTo(wmprect.right + pwnd.dims.left - pwnd.dims.right, pwnd.dims.top);
    
        if (wmprect.left > pwnd.dims.left)
            pwnd.dims.moveTo(wmprect.left, pwnd.dims.top);
    
        pwnd.rect.moveTo(pwnd.rect.left + pwnd.dims.left - oldleft, pwnd.rect.top + pwnd.dims.top - oldtop);
    
        if (restoreRect == null)
            pwnd.restoreRect = pwnd.dims.clone();
    
/*        if (pwnd.restoreRect.top < 0 && g_sci->getPlatform() == Common::kPlatformMacintosh &&
            (style & WindowStyle.USER) && _wmgrPort->top + pwnd->restoreRect.top >= 0) {
            // Special case for Dr. Brain 1 Mac (check above), applied to the
            // restore rectangle.
            pwnd->restoreRect.moveTo(pwnd->restoreRect.left, wmprect.top);
        }*/
    
        if (draw)
            drawWindow(pwnd);
        setPort(pwnd);
    
        // All SCI0 games till kq4 .502 (not including) did not adjust against _wmgrPort, we set _wmgrPort->top to 0 in that case
        setOrigin(pwnd.rect.left, pwnd.rect.top + wmgrPort.top);
        pwnd.rect.moveTo(0, 0);
        return pwnd;
	
	}
	
	function drawWindow(wnd) {}
	function removeWindow(wnd, reanimate) {}
	function freeWindow(wnd) {}
	function updateWindow(wnd) {}

	function getPortById(id) {}

	function setPort(newPort) {
        var oldPort = curPort;
        curPort = newPort;
        return oldPort;
	}
	
	function getPort() {
		return curPort;
	}
	
	function setOrigin(left, top) {
		curPort.left = left;
		curPort.top = top;
	}
	
	function moveTo(left, top) {}
	function move(left, top) {}
	
	function openPort(port) {
        port.fontId = 0;
        port.fontHeight = 8;
    
        var tmp = curPort;
        curPort = port;
        // TODO
        GfxText.setFont(port.fontId);
        curPort = tmp;
    
        port.top = 0;
        port.left = 0;
        port.greyedOutput = false;
        port.penClr = 0;
        port.backClr = 16; //_screen->getColorWhite();
        port.penMode = 0;
        port.rect = bounds.clone();
	}
	
	function penColor(color) {}
	function backColor(color) {}
	function penMode(mode) {}
	function textGreyedOutput(state) {}
	function getPointSize() {}

	function offsetRect(r) {
		r.top += curPort.top;
		r.bottom += curPort.top;
		r.left += curPort.left;
		r.right += curPort.left;
	}
	
	function offsetLine(start, end) {}
	function clipLine(start, end) {}

	function priorityBandsInit(bandCount, top, bottom) {
        var y;
        var bandSize;
    
        if (bandCount != -1)
            priorityBandCount = bandCount;
    
        priorityTop = top;
        priorityBottom = bottom;
    
        // Do NOT modify this algo or optimize it anyhow, sierra sci used int32 for calculating the
        //  priority bands and by using double or anything rounding WILL destroy the result
        bandSize = ((priorityBottom - priorityTop) * 2000) / priorityBandCount;
    
    	for(var n = 0; n<priorityTop; n++) {
    		priorityBands[n] = 0;
    	}

        for (y = priorityTop; y < priorityBottom; y++)
            priorityBands[y] = parseInt(1 + (((y - priorityTop) * 2000) / bandSize));
            
        if (priorityBandCount == 15) {
            // When having 15 priority bands, we actually replace band 15 with band 14, cause the original sci interpreter also
            //  does it that way as well
            y = priorityBottom;
            while (priorityBands[--y] == priorityBandCount)
                priorityBands[y]--;
        }
        // We fill space that is left over with the highest band (hardcoded 200 limit, because this algo isnt meant to be used on hires)
        for (y = priorityBottom; y < 200; y++)
            priorityBands[y] = priorityBandCount;
    
        // adjust, if bottom is 200 (one over the actual screen range) - we could otherwise go possible out of bounds
        //  sierra sci also adjust accordingly
        if (priorityBottom == 200)
            priorityBottom--;	    
	}
	
	function priorityBandsInitSci11(data) {}

	function kernelInitPriorityBands() {
        if (usesOldGfxFunctions) {
            priorityBandsInit(15, 42, 200);
        } 
        else {
            if (getSciVersion() >= SciVersion.SCI_VERSION_1_1)
                priorityBandsInit(14, 0, 190);
            else
                priorityBandsInit(14, 42, 190);
        }
	}
	
	function kernelGraphAdjustPriority(top, bottom) {}
	
	function kernelCoordinateToPriority(y) {
		if (y < priorityTop)
            return priorityBands[priorityTop];
        if (y > priorityBottom)
            return priorityBands[priorityBottom];
        return priorityBands[y];
	}
	
	function kernelPriorityToCoordinate(priority) {
        var y;
        if (priority <= priorityBandCount) {
            for (y = 0; y <= priorityBottom; y++)
                if (priorityBands[y] == priority)
                    return y;
        }
        return priorityBottom;
	}
	
	function processEngineHunkList(wm) {}

    var init = function() {
        var offTop = 10;
    
        usesOldGfxFunctions = GameFeatures.usesOldGfxFunctions();
    
        freeCounter = 0;
    
        // _menuPort has actually hardcoded id 0xFFFF. Its not meant to be known to windowmanager according to sierra sci
        menuPort = new Port(0xFFFF);
        openPort(menuPort);
        setPort(menuPort);
        GfxText.setFont(0);
        menuPort.rect = new Rect(0, 0, Screen.width, Screen.height);
        menuBarRect = new Rect(0, 0, Screen.width, 9);
        menuRect = new Rect(0, 0, Screen.width, 10);
        menuLine = new Rect(0, 9, Screen.width, 10);
    
        wmgrPort = new Port(1);
        windowsById[0] = wmgrPort; // wmgrPort is supposed to be accessible via id 0
        windowsById[1] = wmgrPort; //  but wmgrPort may not actually have id 0, so we assign id 1 (as well)
        // Background: sierra sci replies with the offset of curPort on kGetPort calls. If we reply with 0 there most games
        //				will work, but some scripts seem to check for 0 and initialize the variable again in that case
        //				resulting in problems.
    
        if (getSciVersion() >= SciVersion.SCI_VERSION_1_LATE)
            styleUser = WindowStyle.USER;
        else
            styleUser = WindowStyle.USER | WindowStyle.TRANSPARENT;
    
        // Jones, Slater, Hoyle 3&4 and Crazy Nicks Laura Bow/Kings Quest were
        // called with parameter -Nw 0 0 200 320.
        // Mother Goose (SCI1) uses -Nw 0 0 159 262. The game will later use
        // SetPort so we don't need to set the other fields.
        // This actually meant not skipping the first 10 pixellines in windowMgrPort
        /*switch (g_sci->getGameId()) {
        case GID_JONES:
        case GID_SLATER:
        case GID_HOYLE3:
        case GID_HOYLE4:
        case GID_CNICK_LAURABOW:
        case GID_CNICK_KQ:
            offTop = 0;
            break;
        case GID_MOTHERGOOSE256:
            // only the SCI1 and SCI1.1 (VGA) versions need this
            offTop = 0;
            break;
        case GID_FAIRYTALES:
            // Mixed-Up Fairy Tales (& its demo) uses -w 26 0 200 320. If we don't
            // also do this we will get not-fully-removed windows everywhere.
            offTop = 26;
            break;
        default:
            // For Mac games running with a height of 190, we do not have a menu bar
            // so the top offset should be 0.
            if (_screen->getHeight() == 190)
                offTop = 0;
            break;
        }*/
        
    
        openPort(wmgrPort);
        setPort(wmgrPort);
        // SCI0 games till kq4 (.502 - not including) did not adjust against _wmgrPort in kNewWindow
        //  We leave _wmgrPort top at 0, so the adjustment wont get done
        if (GameFeatures.usesOldGfxFunctions()) {
            setOrigin(0, offTop);
            wmgrPort.rect.bottom = Screen.height - offTop;
        } else {
            wmgrPort.rect.bottom = Screen.height;
        }
        wmgrPort.rect.right = Screen.width;
        wmgrPort.rect.moveTo(0, 0);
        wmgrPort.curTop = 0;
        wmgrPort.curLeft = 0;
        windowList.push(wmgrPort);
    
        picWind = addWindow(new Rect(0, offTop, Screen.width, Screen.height), null, "", WindowStyle.TRANSPARENT | WindowStyle.NOFRAME, 0, true);
        // For SCI0 games till kq4 (.502 - not including) we set _picWind top to offTop instead
        //  Because of the menu/status bar
        if (GameFeatures.usesOldGfxFunctions())
            picWind.top = offTop;
    
        kernelInitPriorityBands();    
	}
	
    

    return {
    	init : init,
    	kernelCoordinateToPriority : kernelCoordinateToPriority,
    	
    	setPort : setPort,
    	getPort : getPort,
    	picWind : function() { return picWind; },
    	offsetRect : offsetRect
    };
})();

var ObjectOffsets = {
	LocalVariables : -6,
	FunctionArea : -4,
	SelectorCounter : -2,
	SelectorSegment : 0,
	InfoSelectorSci0 : 4,
	NamePointerSci0 : 6,
	InfoSelectorSci11 : 14,
	NamePointerSci11 : 16
};

var infoSelectorFlags = {
	kInfoFlagClone : 0x0001,
	kInfoFlagClass : 0x8000
};


function ScriptObject() {
    this.offset = getSciVersion() < SciVersion.SCI_VERSION_1_1 ? 0 : 5;
    this.flags = 0;
	this.baseObj = 0;
	this.baseVars = 0;
	this.methodCount = 0;
	this.propertyOffsetsSci3 = 0;
	this.variables = [];
	this.baseMethod = [];
}

ScriptObject.prototype = {
    copyFrom : function(other) {
        this.offset = other.offset;
        this.flags = other.flags;
        this.baseObj = other.baseObj;
        this.baseVars = other.baseVars;
        this.methodCount = other.methodCount;
        this.propertyOffsetsSci3 = other.propertyOffsetsSci3;
        
        for(x in other.variables) {
            this.variables[x] = other.variables[x].clone();
        }
        for(x in other.baseMethod) {
            this.baseMethod[x] = other.baseMethod[x];
        }
        this.pos = other.pos.clone();
    },

    allocVariables : function(numVariables) {
        this.variables = new Array(numVariables);
        for(var v = 0; v<numVariables; v++) {
            this.variables[v] = new Reg(0, 0);
        }
    },

    init : function(buf, objPos, initVariables) {
	    this.buf = buf;
	    this.baseObj = objPos.offset;
	    this.pos = objPos;

        if (getSciVersion() <= SciVersion.SCI_VERSION_1_LATE) {
            var numVariables = this.buf.getUint16LE(objPos.offset + ObjectOffsets.SelectorCounter);
            this.allocVariables(numVariables);
        
            this.baseVars = (this.baseObj + numVariables * 2);
            var funcOffsetArea = this.buf.getUint16LE(objPos.offset + ObjectOffsets.FunctionArea);
            this.methodCount = this.buf.getUint16LE(objPos.offset + funcOffsetArea - 2); 
            for (var i = 0; i < this.methodCount * 2 + 2; ++i) {
                this.baseMethod.push(this.buf.getUint16LE(objPos.offset + funcOffsetArea + i * 2));            
            }
        } 
        // TODO: later SCI versions
        /*else if (getSciVersion() >= SCI_VERSION_1_1 && getSciVersion() <= SCI_VERSION_2_1) {
            _variables.resize(READ_SCI11ENDIAN_UINT16(data + 2));
            _baseVars = (const uint16 *)(buf + READ_SCI11ENDIAN_UINT16(data + 4));
            _methodCount = READ_SCI11ENDIAN_UINT16(buf + READ_SCI11ENDIAN_UINT16(data + 6));
            for (int i = 0; i < _methodCount * 2 + 3; ++i) {
                _baseMethod.push_back(READ_SCI11ENDIAN_UINT16(buf + READ_SCI11ENDIAN_UINT16(data + 6) + i * 2));
            }
        } else if (getSciVersion() == SCI_VERSION_3) {
            initSelectorsSci3(buf);
        }*/
    
        if (initVariables) {
            if (getSciVersion() <= SciVersion.SCI_VERSION_2_1) {
                for (var i = 0; i < this.variables.length; i++) {
                    this.variables[i] = new Reg(0, this.buf.getUint16LE(objPos.offset + (i * 2)));
                    
                    if(i == 9)
                        Debug.log("ScriptObject", "Variable " + i + " = " + this.variables[i].offset);
                }
            } else {
                this.infoSelectorSci3 = new Reg(0, this.buf.getUint16LE(baseObj + 10));
            }
        }
    },
    
    locateVarSelector : function(slc) {
        var buf = this.buf;
        var ptr = 0;
        var varnum = 0;
    
        if (getSciVersion() <= SciVersion.SCI_VERSION_2_1) {
            var obj = this.getClass();
            varnum = getSciVersion() <= SciVersion.SCI_VERSION_1_LATE ? this.variables.length : obj.variables[1].toUint16();
            ptr = obj.baseVars;
            buf = obj.buf;
        } 
        else 
        if (getSciVersion() == SciVersion.SCI_VERSION_3) {
            varnum = this.variables.length;
            ptr = this.baseVars;
        }
    
        for (var i = 0; i < varnum; i++) {
//            if (READ_SCI11ENDIAN_UINT16(buf + (i << 1)) == slc) // Found it?
            if(buf.getUint16LE(ptr + (i << 1)) == slc)
                return i; // report success
        }
    
        return -1; // Failed
    },
    
    varToSelector : function(idx) {
        var buf = this.buf;
        var ptr = 0;
        var varnum = 0;
    
        if (getSciVersion() <= SciVersion.SCI_VERSION_2_1) {
            var obj = this.getClass();
            varnum = getSciVersion() <= SciVersion.SCI_VERSION_1_LATE ? this.variables.length : obj.variables[1].toUint16();
            ptr = obj.baseVars;
            buf = obj.buf;
        } 
        else 
        if (getSciVersion() == SciVersion.SCI_VERSION_3) {
            varnum = this.variables.length;
            ptr = this.baseVars;
        }

        return buf.getUint16LE(ptr + (idx << 1));        
    },

    getVarCount : function() {
        return this.variables.length;
    },
    
    getVariable : function(index) {
        return this.variables[index].clone();
    },

    getVariableRef : function(index) {
        return this.variables[index];
    },

	isClass : function() { 
	    return (this.getInfoSelector().offset & infoSelectorFlags.kInfoFlagClass) != 0; 
    },


    getClass : function() {
        return this.isClass() ? this : SegManager.getObject(this.getSuperClassSelector());
    },

    
	getSpeciesSelector : function()  {
		if (getSciVersion() <= SciVersion.SCI_VERSION_2_1)
			return this.variables[this.offset];
		else	// SCI3
			return this.speciesSelectorSci3;
	},

	setSpeciesSelector : function(value) {
		if (getSciVersion() <= SciVersion.SCI_VERSION_2_1)
			this.variables[this.offset] = value;
		else	// SCI3
			this.speciesSelectorSci3 = value;
	},
	
    getSuperClassSelector : function()  {
		if (getSciVersion() <= SciVersion.SCI_VERSION_2_1)
			return this.variables[this.offset + 1];
		else	// SCI3
			return this.superClassPosSci3;
	},

	setSuperClassSelector : function(value) {
		if (getSciVersion() <= SciVersion.SCI_VERSION_2_1)
			this.variables[this.offset + 1] = value;
		else	// SCI3
			this.superClassPosSci3 = value;
	},

    getInfoSelector : function()  {
		if (getSciVersion() <= SciVersion.SCI_VERSION_2_1)
			return this.variables[this.offset + 2];
		else	// SCI3
			return this.infoSelectorSci3;
	},

	setInfoSelector : function(value) {
		if (getSciVersion() <= SciVersion.SCI_VERSION_2_1)
			this.variables[this.offset + 2] = value;
		else	// SCI3
			this.infoSelectorSci3 = value;
	},

	getNameSelector : function() {
		if (getSciVersion() <= SciVersion.SCI_VERSION_2_1)
			return this.offset + 3 < this.variables.length ? this.variables[this.offset + 3] : new Reg(0, 0);
		else	// SCI3
			return this.variables.length > 0 ? this.variables[0] : new Reg(0, 0);
	},

    initSpecies : function(addr) {
	    var speciesOffset = this.getSpeciesSelector().offset;

        if (speciesOffset == 0xffff)		// -1
            this.setSpeciesSelector(new Reg(0, 0));	// no species
        else
            this.setSpeciesSelector(SegManager.getClassAddress(speciesOffset, ScriptLoadType.SCRIPT_GET_LOCK, addr).clone());
            
//        Debug.log("Species selector at addr " + addr.toString() + " is " + this.getSpeciesSelector().toString());
    },

    initSuperClass : function(addr) {
	    var superClassOffset = this.getSuperClassSelector().offset;

        if (superClassOffset == 0xffff)			// -1
            this.setSuperClassSelector(new Reg(0, 0));	// no superclass
        else
            this.setSuperClassSelector(SegManager.getClassAddress(superClassOffset, ScriptLoadType.SCRIPT_GET_LOCK, addr).clone());

//        Debug.log("Superclass selector at addr " + addr.toString() + " is " + this.getSuperClassSelector().toString());
    },

    initBaseObject : function(addr, doInitSuperClass) {
        if(typeof doInitSuperClass == 'undefined')
            doInitSuperClass = true;
    
        var baseObj = SegManager.getObject(this.getSpeciesSelector());
        
//        Debug.log("Base object for addr " + addr.toString() + ":");
//        Debug.log(baseObj);
    
        if (baseObj != null) {
            var originalVarCount = this.variables.length;
    
            if (this.variables.length != baseObj.variables.length)
            {
                // TODO
//                _variables.resize(baseObj->getVarCount());
                Debug.error("Variable lengths different");
            }
                
            // Copy base from species class, as we need its selector IDs
            baseObj = baseObj.baseObj;
            
            if (doInitSuperClass)
                this.initSuperClass(addr);
    
            if (this.variables.length != originalVarCount) {
                /*// These objects are probably broken.
                // An example is 'witchCage' in script 200 in KQ5 (#3034714),
                // but also 'girl' in script 216 and 'door' in script 22.
                // In LSL3 a number of sound objects trigger this right away.
                // SQ4-floppy's bug #3037938 also seems related.
    
                // The effect is that a number of its method selectors may be
                // treated as variable selectors, causing unpredictable effects.
                int objScript = segMan->getScript(_pos.segment)->getScriptNumber();
    
                // We have to do a little bit of work to get the name of the object
                // before any relocations are done.
                reg_t nameReg = getNameSelector();
                const char *name;
                if (nameReg.isNull()) {
                    name = "<no name>";
                } else {
                    nameReg.segment = _pos.segment;
                    name = segMan->derefString(nameReg);
                    if (!name)
                        name = "<invalid name>";
                }*/
    
            }
    
            return true;
        }
    
        return false;
    },
    
    getFunction : function(i) {
		var offset = (getSciVersion() < SciVersion.SCI_VERSION_1_1) ? this.methodCount + 1 + i : i * 2 + 2;
		if (getSciVersion() == SciVersion.SCI_VERSION_3)
			offset--;
		return new Reg(this.pos.segment, this.baseMethod[offset]);
	},

	getFuncSelector : function(i) {
		var offset = (getSciVersion() < SciVersion.SCI_VERSION_1_1) ? i : i * 2 + 1;
		if (getSciVersion() == SciVersion.SCI_VERSION_3)
			offset--;
		return this.baseMethod[offset];
	},
	
	funcSelectorPosition : function(sel) {
		for (var i = 0; i < this.methodCount; i++)
			if (this.getFuncSelector(i) == sel)
				return i;

		return -1;
	},
	
	relocateSci0Sci21 : function(segment, location, scriptSize) {
	    return relocateBlock(this.variables, this.pos.offset, segment, location, scriptSize);
	}
};
var ScriptObjectTypes = {
	SCI_OBJ_TERMINATOR : 0,
	SCI_OBJ_OBJECT : 1,
	SCI_OBJ_CODE : 2,
	SCI_OBJ_SYNONYMS : 3,
	SCI_OBJ_SAID : 4,
	SCI_OBJ_STRINGS : 5,
	SCI_OBJ_CLASS : 6,
	SCI_OBJ_EXPORTS : 7,
	SCI_OBJ_POINTERS : 8,
	SCI_OBJ_PRELOAD_TEXT : 9, /* This is really just a flag. */
	SCI_OBJ_LOCALVARS : 10
};

/** Magical object identifier */
var SCRIPT_OBJECT_MAGIC_NUMBER = 0x1234;

/** Offset of this identifier */
var SCRIPT_OBJECT_MAGIC_OFFSET = (getSciVersion() < SciVersion.SCI_VERSION_1_1 ? -8 : 0);


function Script(scriptNum, scriptData) {
    this.scriptNum = parseInt(scriptNum);
    this.buf = scriptData;
    
    // TEMPORARY
    this.buf.data = this.buf.data.slice(2);
    
    this.segmentType = SegmentType.SEG_TYPE_SCRIPT;
    this.segmentId = SegManager.allocScript(this);

    this.exportTable = 0;
	this.numExports = 0;
	this.synonyms = 0;
	this.numSynonyms = 0;
	
	this.localsSegment = 0;
	this.localsCount = 0;
	this.localsBlock = null;
	this.localsOffset = 0;
	
	this.objects = {};
    
    this.parseData();
    this.initialised = false;
//    this.init();
   // Disassembler.disassemble(this.buf);
}

Script.prototype = {
    init : function() {
        if(this.initialised) {
            return;
        }
        
        Debug.log("Script", "Initialising script " + this.scriptNum);
        //Debug.log("Dependencies are:");
        //Debug.log(this.calculateScriptDependencies());
        this.initLocals();
        this.initClasses();
        this.initObjects();
        this.initialised = true;
    },
    
    calculateScriptDependencies : function() {
        var dependencies = {};
        var index = 0;

        while(true) {
            var pos = this.findBlockSCI0(ScriptObjectTypes.SCI_OBJ_OBJECT, index++);
            
            if(pos == 0)
                break;
                
            var species = this.buf.getUint16LE(pos + 12);
            var superClass = this.buf.getUint16LE(pos + 14);
            
            dependencies[SegManager.getClassOwner(species)] = true;
            dependencies[SegManager.getClassOwner(superClass)] = true;
        }
        
        return dependencies;
    },

    findBlockSCI0 : function(type, startBlockIndex) {
        if(typeof(startBlockIndex) == 'undefined') {
            startBlockIndex = -1;
        }
    
        var blockIndex = 0;
        var index = 0;
        var pos = 0;
        
        while(pos < this.buf.getLength()) {
            var blockType = this.buf.getUint16LE(pos);
            
            if(blockType == ScriptObjectTypes.SCI_OBJ_TERMINATOR) {
                break;
            }
            if(blockType == type && blockIndex > startBlockIndex) {
                return pos;
            }
            
            //Debug.log("Block type : " + blockType);

            var blockSize = this.buf.getUint16LE(pos + 2);
            
            pos += blockSize;
            blockIndex ++;
        }
        
        return 0;        
    },
    
    allocLocalsSegment : function() {
	    if (this.localsCount == 0) { // No locals
		    return null;
    	} 
    	else {
		    var locals;

            if (this.localsSegment != 0) {
                locals = SegManager.getSegment(this.localsSegment, SegmentType.SEG_TYPE_LOCALS);
                if (locals == null || locals.scriptId != this.scriptNum)
                    Debug.error("Invalid script locals segment while allocating locals");
            } 
            else
            {
                locals = new LocalVariables();
                this.localsSegment = SegManager.allocSegment(locals);
            }
    
            this.localsBlock = locals;
            locals.scriptID = this.scriptNum;
            locals.initLocals(this.localsCount);
    
            return locals;
        }
    },
    
    getScriptSize : function() { return this.buf.length; },
    getBufSize : function() { return this.buf.length; },
    
    getLocalsSegment : function() { return this.localsSegment; },
    
    getLocalsBegin : function() { return this.localsBlock != null ? new ArrayPtr(this.localsBlock.locals, 0) : null; },
        
    initLocals : function() {
        var locals = this.allocLocalsSegment();
        
        if(locals != null)
        {
            if (getSciVersion() > SciVersion.SCI_VERSION_0_EARLY) {
                for(var i = 0; i<this.localsCount; i++) {
                    locals.locals[i] = new Reg(0, this.buf.getUint16LE(this.localsOffset + i * 2));
                }
            } 
            else {
                // In SCI0 early, locals are set at run time, thus zero them all here
                for(var i = 0; i<this.localsCount; i++) {
                    locals.locals[i] = NULL_REG;
                }
            }
        }
    },
    
    initClasses : function() {
        var seeker = 0;
        var mult = 0;
    
        if (getSciVersion() <= SciVersion.SCI_VERSION_1_LATE) {
            seeker = this.findBlockSCI0(ScriptObjectTypes.SCI_OBJ_CLASS);
            mult = 1;
        } 
        // TODO SCI 1 support
/*        else if (getSciVersion() >= SciVersion.SCI_VERSION_1_1 && getSciVersion() <= SciVersion.SCI_VERSION_2_1) {
            seeker = _heapStart + 4 + READ_SCI11ENDIAN_UINT16(_heapStart + 2) * 2;
            mult = 2;
        } 
        else if (getSciVersion() == SciVersion.SCI_VERSION_3) {
            seeker = getSci3ObjectsPointer();
            mult = 1;
        }*/
    
        if (seeker == 0)
            return;
    
        var marker;
        var isClass = false;
        var classpos;
        var species = 0;
    
        while (true) {
            // In SCI0-SCI1, this is the segment type. In SCI11, it's a marker (0x1234)
            marker = this.buf.getUint16LE(seeker);
            classpos = seeker;
    
            if (getSciVersion() <= SciVersion.SCI_VERSION_1_LATE && marker == 0)
                break;
    
            if (getSciVersion() >= SciVersion.SCI_VERSION_1_1 && marker != SCRIPT_OBJECT_MAGIC_NUMBER)
                break;
    
            if (getSciVersion() <= SciVersion.SCI_VERSION_1_LATE) {
                isClass = (marker == ScriptObjectTypes.SCI_OBJ_CLASS);
                if (isClass)
                    species = this.buf.getUint16LE(seeker + 12);
                classpos += 12;
            }/* else if (getSciVersion() >= SCI_VERSION_1_1 && getSciVersion() <= SCI_VERSION_2_1) {
                isClass = (READ_SCI11ENDIAN_UINT16(seeker + 14) & kInfoFlagClass);	// -info- selector
                species = READ_SCI11ENDIAN_UINT16(seeker + 10);
            } else if (getSciVersion() == SCI_VERSION_3) {
                isClass = (READ_SCI11ENDIAN_UINT16(seeker + 10) & kInfoFlagClass);
                species = READ_SCI11ENDIAN_UINT16(seeker + 4);
            }*/
    
            if (isClass) {
                // TODO WORKAROUNDs for off-by-one script errors
                /*if (species == (int)segMan->classTableSize()) {
                    if (g_sci->getGameId() == GID_LSL2 && g_sci->isDemo())
                        segMan->resizeClassTable(species + 1);
                    else if (g_sci->getGameId() == GID_LSL3 && !g_sci->isDemo() && _nr == 500)
                        segMan->resizeClassTable(species + 1);
                    else if (g_sci->getGameId() == GID_SQ3 && !g_sci->isDemo() && _nr == 93)
                        segMan->resizeClassTable(species + 1);
                    else if (g_sci->getGameId() == GID_SQ3 && !g_sci->isDemo() && _nr == 99)
                        segMan->resizeClassTable(species + 1);
                }
    
                if (species < 0 || species >= (int)segMan->classTableSize())
                    error("Invalid species %d(0x%x) unknown max %d(0x%x) while instantiating script %d\n",
                              species, species, segMan->classTableSize(), segMan->classTableSize(), _nr);
                */
                
                var segmentId = SegManager.getScriptSegment(this.scriptNum);
                SegManager.setClassOffset(species, new Reg(segmentId, classpos));
            }
    
            seeker += this.buf.getUint16LE(seeker + 2) * mult;
        }        
    },
    
    initObjects : function() {
        if (getSciVersion() <= SciVersion.SCI_VERSION_1_LATE)
            this.initObjectsSCI0();
        // TODO: Newer SCI versions
    },
    
    initObjectsSCI0 : function() {
        var oldScriptHeader = (getSciVersion() == SciVersion.SCI_VERSION_0_EARLY);

        // We need to make two passes, as the objects in the script might be in the
        // wrong order (e.g. in the demo of Iceman) - refer to bug #3034713
        for (var pass = 1; pass <= 2; pass++) {
            var seeker = (oldScriptHeader ? 2 : 0);
            
            //seeker += 2;
    
            do {
                var objType = this.buf.getUint16LE(seeker);
                if (objType == 0)
                    break;
    
                switch (objType) {
                case ScriptObjectTypes.SCI_OBJ_OBJECT:
                case ScriptObjectTypes.SCI_OBJ_CLASS:
                    {
                        var addr = new Reg(this.segmentId, seeker + 4);
                        var obj = this.scriptObjInit(addr);
                        obj.initSpecies(addr);
    
                        if (pass == 2) {
                            if (!obj.initBaseObject(addr)) {
                                Debug.error("Did not init base Object at addr " + addr.toString());
                                // TODO: workaround
                                /*if ((_nr == 202 || _nr == 764) && g_sci->getGameId() == GID_KQ5) {
                                    // WORKAROUND: Script 202 of KQ5 French and German
                                    // (perhaps Spanish too?) has an invalid object.
                                    // This is non-fatal. Refer to bugs #3035396 and
                                    // #3150767.
                                    // Same happens with script 764, it seems to
                                    // contain junk towards its end.
                                    _objects.erase(addr.toUint16() - SCRIPT_OBJECT_MAGIC_OFFSET);
                                } else {
                                    error("Failed to locate base object for object at %04X:%04X", PRINT_REG(addr));
                                }*/
                            }
                            else {
                              //  Debug.log("Successfully initialised base object at addr " + addr.toString());
                            }
                        }
                    }
                    break;
    
                default:
                    break;
                }
    
                seeker += this.buf.getUint16LE(seeker + 2);
            } while (seeker < this.buf.getLength() - 2);
        }
    
        var relocationBlock = this.findBlockSCI0(ScriptObjectTypes.SCI_OBJ_POINTERS);
        if (relocationBlock != 0)
            this.relocateSci0Sci21(new Reg(this.segmentId, relocationBlock + 4));    
    },
    
    relocateSci0Sci21 : function(block) {
        var heap = 0;
	    var heapSize = this.buf.getLength();
        var heapOffset = 0;

        if (getSciVersion() >= SciVersion.SCI_VERSION_1_1 && getSciVersion() <= SciVersion.SCI_VERSION_2_1) {
            // TODO
            /*heap = _heapStart;
            heapSize = (uint16)_heapSize;
            heapOffset = _scriptSize;*/
        }

        if (block.offset >= heapSize ||
            this.buf.getUint16LE(heap + block.offset) * 2 + block.offset >= heapSize)
            Debug.error("Relocation block outside of script");
    
        var count = this.buf.getUint16LE(heap + block.offset);
        var exportIndex = 0;
        var pos = 0;
    
        for (var i = 0; i < count; i++) {
            pos = this.buf.getUint16LE(heap + block.offset + 2 + (exportIndex * 2)) + heapOffset;
            // This occurs in SCI01/SCI1 games where usually one export value is
            // zero. It seems that in this situation, we should skip the export and
            // move to the next one, though the total count of valid exports remains
            // the same
            if (pos == 0) {
                exportIndex++;
                pos = this.buf.getUint16LE(heap + block.offset + 2 + (exportIndex * 2)) + heapOffset;
                if (pos == 0)
                    Debug.error("relocateSci0Sci21: Consecutive zero exports found");
            }
    
            // In SCI0-SCI1, script local variables, objects and code are relocated.
            // We only relocate locals and objects here, and ignore relocation of
            // code blocks. In SCI1.1 and newer versions, only locals and objects
            // are relocated.
            if (!this.relocateLocal(block.segment, pos)) {
                // Not a local? It's probably an object or code block. If it's an
                // object, relocate it.
                for(o in this.objects) {
                    if(this.objects[o].relocateSci0Sci21(block.segment, pos, this.buf.getLength()))
                        break;
                }
            }
    
            exportIndex++;
        }
	},
	
	relocateBlock : function(block, blockLocation, segment, location, scriptSize) {
        var rel = location - blockLocation;
    
        if (rel < 0)
            return false;
    
        var idx = rel >> 1;
    
        if (idx >= block.length)
            return false;
    
        if (rel & 1) {
            Debug.error("Attempt to relocate odd variable " + idx + "(relative to " + blockLocation + ")");
            return false;
        }
        block[idx].segment = segment; // Perform relocation
        if (getSciVersion() >= SciVersion.SCI_VERSION_1_1 && getSciVersion() <= SciVersion.SCI_VERSION_2_1)
            block[idx].offset += scriptSize;
    
        return true;
    },
	
	relocateLocal : function(segment, location) {
        if (this.localsBlock != null)
            return this.relocateBlock(this.localsBlock.locals, this.localsOffset, segment, location, this.buf.getLength());
        else
            return false;
    },
    
    parseData : function() {
        if (getSciVersion() <= SciVersion.SCI_VERSION_1_LATE) {
            this.exportTable = this.findBlockSCI0(ScriptObjectTypes.SCI_OBJ_EXPORTS);
            //if (this.exportTable != 0) {
                this.numExports = this.buf.getUint16LE(this.exportTable + 2);
                this.exportTable += 6;	
            //}
            this.synonyms = this.findBlockSCI0(ScriptObjectTypes.SCI_OBJ_SYNONYMS);
            if (this.synonyms != 0) {
                this.numSynonyms = this.buf.getUint16LE(this.synonyms + 2) / 4;
                this.synonyms += 4;	// skip header
            }
            
            var localsBlock = this.findBlockSCI0(ScriptObjectTypes.SCI_OBJ_LOCALVARS);
            if (localsBlock != 0) {
                this.localsOffset = localsBlock + 4;
                this.localsCount = (this.buf.getUint16LE(this.localsOffset - 2) - 4) >> 1;	// half block size
            }
        } /*else if (getSciVersion() >= SCI_VERSION_1_1 && getSciVersion() <= SCI_VERSION_2_1) {
            if (READ_LE_UINT16(_buf + 1 + 5) > 0) {	// does the script have an export table?
                _exportTable = (const uint16 *)(_buf + 1 + 5 + 2);
                _numExports = READ_SCI11ENDIAN_UINT16(_exportTable - 1);
            }
            _localsOffset = _scriptSize + 4;
            _localsCount = READ_SCI11ENDIAN_UINT16(_buf + _localsOffset - 2);
        } else if (getSciVersion() == SCI_VERSION_3) {
            _localsCount = READ_LE_UINT16(_buf + 12);
            _exportTable = (const uint16 *)(_buf + 22);
            _numExports = READ_LE_UINT16(_buf + 20);
            // SCI3 local variables always start dword-aligned
            if (_numExports % 2)
                _localsOffset = 22 + _numExports * 2;
            else
                _localsOffset = 24 + _numExports * 2;
        }*/
        
        if (getSciVersion() == SciVersion.SCI_VERSION_0_EARLY) {
            // SCI0 early
            // Old script block. There won't be a localvar block in this case.
            // Instead, the script starts with a 16 bit int specifying the
            // number of locals we need; these are then allocated and zeroed.
            this.localsCount = this.buf.getUint16LE(0);
            this.localsOffset = -_localsCount * 2; // Make sure it's invalid
    	} 
    	else {
		    // SCI0 late and newer
		    // Does the script actually have locals? If not, set the locals offset to 0
            if (this.localsCount == 0)
                this.localsOffset = 0;
    
            if (this.localsOffset + this.localsCount * 2 + 1 >= this.buf.getLength()) {
                Debug.error("Locals extend beyond end of script!");
                //error("Locals extend beyond end of script: offset %04x, count %d vs size %d", _localsOffset, _localsCount, _bufSize);
                //_localsCount = (_bufSize - _localsOffset) >> 1;
            }
        }
        
//        Debug.log("Finished parsing data for script " + this.scriptNum);
    },
    
    scriptObjInit : function(objPos, fullObjectInit) {
        if(typeof(fullObjectInit) == 'undefined') {
            fullObjectInit = true;
        }
    
        if (getSciVersion() < SciVersion.SCI_VERSION_1_1 && fullObjectInit)
            objPos.offset += 8;	// magic offset (SCRIPT_OBJECT_MAGIC_OFFSET)
    
        if (objPos.offset >= this.buf.getLength())
            Debug.error("Attempt to initialize object beyond end of script");
    
        // Get the object at the specified position and init it. This will
        // automatically "allocate" space for it in the _objects map if necessary.
        var obj = new ScriptObject();
        obj.init(this.buf, objPos, fullObjectInit);
        this.objects[objPos.offset] = obj;
    
        return obj;
    },
    
    isObject : function(offset) {
        return this.buf.getUint16LE(offset + SCRIPT_OBJECT_MAGIC_OFFSET ) == SCRIPT_OBJECT_MAGIC_NUMBER;
    },
    
    getObject : function(offset) {
        var obj = this.objects[offset];
        if(typeof(obj) == 'undefined') {
            return null;
        }
        else return obj;
    },
    
    getExportAddress : function(exportNum) {
        if(exportNum >= 0 && exportNum < this.numExports) {
            var addr = this.buf.getUint16LE(this.exportTable + 2 * exportNum);
            return addr;
        }
        else return 0;
    },
    
    validateExportFunc : function(pubfunct, relocate) {
        var exportsAreWide = (detectLofsType() == SciVersion.SCI_VERSION_1_MIDDLE);
    
        if (this.numExports <= pubfunct) {
            Debug.error("validateExportFunc(): pubfunct is invalid");
            return 0;
        }
    
        if (exportsAreWide)
            pubfunct *= 2;
    
        var offset;
    
        if (getSciVersion() != SciVersion.SCI_VERSION_3 || !relocate) {
            offset = this.buf.getUint16LE(this.exportTable + pubfunct * 2);
        } else {
           // offset = relocateOffsetSci3(pubfunct * 2 + 22);
        }
    
        if (offset >= this.buf.length)
            Debug.error("Invalid export function pointer");
    
        // Check if the offset found points to a second export table (e.g. script 912
        // in Camelot and script 306 in KQ4). Such offsets are usually small (i.e. < 10),
        // thus easily distinguished from actual code offsets.
        // This only makes sense for SCI0-SCI1, as the export table in SCI1.1+ games
        // is located at a specific address, thus findBlockSCI0() won't work.
        // Fixes bugs #3039785 and #3037595.
        /*if (offset < 10 && getSciVersion() <= SCI_VERSION_1_LATE) {
            const uint16 *secondExportTable = (const uint16 *)findBlockSCI0(SCI_OBJ_EXPORTS, 0);
    
            if (secondExportTable) {
                secondExportTable += 3;	// skip header plus 2 bytes (secondExportTable is a uint16 pointer)
                offset = READ_SCI11ENDIAN_UINT16(secondExportTable + pubfunct);
                if (offset >= _bufSize)
                    error("Invalid export function pointer");
            }
        }*/
    
        return offset;
    },

    dereference : function(ptr) {
        return new SegmentRef(this.buf.data, ptr.offset, true);
    }
};

var ResourceType = {
    View : 0x0, 
    Pic : 0x1, 
    Script : 0x2, 
    Text : 0x3,
	Sound : 0x4, 
	Memory : 0x5, 
	Vocab : 0x6, 
	Font : 0x7,
	Cursor : 0x8, 
	Patch : 0x9, 
	Bitmap : 0xA, 
	Palette : 0xB,
	CdAudio : 0xC, 
	Audio : 0xD, 
	Sync : 0xE, 
	Message : 0xF,    
	Map : 0x10, 
	Heap : 0x11, 
	Audio36 : 0x12, 
	Sync36 : 0x13,  
	Translation : 0x14
};

var ResourceManager = (function() {
    var RESOURCE_PENDING = 'RESOURCE_PENDING';
    var resourcePath = "demodata/";
    var loadedScripts = {};
    var loadedCursors = {};
    var loadedFonts = {};
    var loadedViews = {};

    var loadResource = function(url, onLoad) {
        FileLoader.loadBase64(resourcePath + url, function(resourceData) {
            onLoad(resourceData);
        });
    }
    
    var generateResourcePath = function(resourceName, resourceNum) {
        var prefixedNum = resourceNum.toString();
        while(prefixedNum.length < 3) {
            prefixedNum = "0" + prefixedNum;
        }
        return  resourcePath + resourceName + "." + prefixedNum;
    }
    
    var generateScriptPath = function(scriptNum) {
        return generateResourcePath("script", scriptNum) + ".b64";
    }
    
    var isScriptLoaded = function(scriptNum) {
        return loadedScripts[scriptNum] instanceof Script;
    }
    
    var isScriptLoading = function(scriptNum) {
        return loadedScripts[scriptNum] == RESOURCE_PENDING;
    }
    
    var loadCursor = function(cursorNum) {
        if(loadedCursors[cursorNum] instanceof Cursor)
            return loadedCursors[cursorNum];
        if(loadedCursors[cursorNum] == RESOURCE_PENDING)
            return null;
            
        loadedCursors[cursorNum] = RESOURCE_PENDING;
        
        var cursorPath = generateResourcePath("cursor", cursorNum);
        FileLoader.loadImage(cursorPath + ".png", function(cursorImage) {
           FileLoader.loadJSON(cursorPath + ".json", function(cursorData) {
                var newCursor = new Cursor(cursorImage, cursorData);
                loadedCursors[cursorNum] = newCursor;
           });
        });
        
        
        return null;
    }

    var loadView = function(viewNum) {
        if(loadedViews[viewNum] instanceof View)
            return loadedViews[viewNum];
        if(loadedViews[viewNum] == RESOURCE_PENDING)
            return null;
            
        loadedViews[viewNum] = RESOURCE_PENDING;
        
        var viewPath = generateResourcePath("view", viewNum);
        FileLoader.loadImage(viewPath + ".png", function(viewImage) {
           FileLoader.loadJSON(viewPath + ".json", function(viewData) {
                var newView = new View(viewImage, viewData);
                loadedViews[viewNum] = newView;
           });
        });
        
        
        return null;
    }

    var loadFont = function(fontNum) {
        if(loadedFonts[fontNum] instanceof Font)
            return loadedFonts[fontNum];
        if(loadedFonts[fontNum] == RESOURCE_PENDING)
            return null;
            
        loadedFonts[fontNum] = RESOURCE_PENDING;
        
        var fontPath = generateResourcePath("font", fontNum);
        FileLoader.loadImage(fontPath + ".png", function(fontImage) {
           FileLoader.loadJSON(fontPath + ".json", function(fontData) {
                var newFont = new Font(viewImage, viewData);
                loadedFonts[fontNum] = newFont;
           });
        });
        
        
        return null;
    }

    var loadText = function(textNum) {
        var textPath = generateResourcePath("text", textNum);
        
        if(FileLoader.isLoaded(textPath)) {
            return FileLoader.getFile(textPath).substr(2);
        }
        else {
            FileLoader.loadText(textPath, function() {});
        }
        
        return null;
    }

    var loadPic = function(picNum) {
        var picPath = generateResourcePath("pic", picNum) + ".png";
        
        if(FileLoader.isLoaded(picPath)) {
            return FileLoader.getFile(picPath);
        }
        else {
            FileLoader.loadImage(picPath, function() {});
        }
        
        return null;
    }

    var loadScript = function(scriptNum, loadDependencies) {
        if(typeof loadDependencies == 'undefined')
            loadDependencies = true;
        
        if(isScriptLoaded(scriptNum)) {
            return loadedScripts[scriptNum];
        }
        else if(isScriptLoading(scriptNum)) {
            return null;
        }
        else {
            loadedScripts[scriptNum] = RESOURCE_PENDING;
            FileLoader.loadBase64(generateScriptPath(scriptNum),
                function(scriptData) {
                    var newScript = new Script(scriptNum, scriptData);
                    loadedScripts[scriptNum] = newScript;
                    
                    if(loadDependencies) {
                        var dependencies = newScript.calculateScriptDependencies();
                        for(var d in dependencies) {
                            if(!isScriptLoaded(d) && !isScriptLoading(d)) {
                                loadScript(d, function() {}, loadDependencies);
                            }
                        }
                        
                        FileLoader.onLoadingFinished.addOnce(function() {
                            newScript.init();
                        }, true);
                    }
                    else {
                        newScript.init();
                    }
                });
        }
        return null;
    }
    
    

    return {
        // Public members
        resourcePath : resourcePath,
        loadCursor : loadCursor,
        loadScript : loadScript,
        loadResource : loadResource,
        loadPic : loadPic,
        loadText : loadText,
        loadFont : loadFont,
        loadView : loadView,
        load : function(url, onLoad) {
            FileLoader.loadBase64(url, function(scriptData) {
                var newScript = new Script(0, scriptData);
                
                Engine.run();
            });   
        }
    };
})();


function KernelSubFunction(func) {
	this.func = func;
	this.name = "KernelSubFunc";
	this.signature = 0xFFFF;
	this.workarounds = null;
};

function KernelFunction(kernelNum, func, subFuncs) {
    this.kernelNum = kernelNum;
    this.func = func;
	this.name = "KernelFunc";
	this.signature = 0xFFFF;
	this.workarounds = null;
	this.subFunctions = subFuncs;
};

function createStubFunction(name) {
    return function(args) {
        Debug.warn("Called kernel function stub " + name);
        return VM.state.acc;
    };
}

var warnedOfStub = {};

var Kernel = (function() {
    var kernelFuncs = [];
    var kernelNames = [];

    var createStubs = function() {
        for(var k = 0; k<128; k++) {
            kernelFuncs[k] = new KernelFunction(k, function(args) { 
                if(typeof warnedOfStub[this.kernelNum] == 'undefined') {
                    var argString = "";
                    for(var c = 0; c<args.length; c++) {
                        argString = argString + args[c].toString() + "  ";
                    }
                    
                    Debug.warn("Called kernel stub for function 0x" + this.kernelNum.toString(16) + " : " + kernelNames[this.kernelNum]);
                    if(args.length > 0) {
                        Debug.warn("Kernel call args (" + args.length + "): " + argString);
                    }
                    
                    warnedOfStub[this.kernelNum] = true;
                }
                
                return VM.state.acc;
            }, []);
        }
    }
    
    var setDefaultKernelNames = function() {
        kernelNames = defaultKernelNames.slice();
        
        kernelNames.splice(0x29, 0, "FOpen");
        kernelNames.splice(0x2A, 0, "FPuts");
        kernelNames.splice(0x2B, 0, "FGets");
        kernelNames.splice(0x2C, 0, "FClose");

        // Function 0x55 is DoAvoider
        kernelNames[0x55] = "DoAvoider";

        // Cut off unused functions
        kernelNames.splice(0x72);
//        Debug.log(kernelNames);
    }
    
    var mapFunc = function(kernelName, func) {
        var kernelId = kernelNames.indexOf(kernelName);
        
        if(kernelId < 0) {
            Debug.error("Kernel function " + kernelName + " not valid!");
            return;
        }
        
        kernelFuncs[kernelId].func = func;
        return kernelFuncs[kernelId];
    }
    
    var mapKernelFunctions = function() {
/*        mapFunc("NewList", kNewList);
        mapFunc("SetCursor", kSetCursor);
        mapFunc("ScriptID", kScriptID);
  */      
        for(var x in kernelNames)
        {
            var name = kernelNames[x];
            var func = window["k" + name];
            if(typeof func == 'function')
            {
                var kernelFunction = mapFunc(name, func);

                if(typeof func.prototype.subFunctions != 'undefined') {
                    for(sub in func.prototype.subFunctions) {
                        kernelFunction.subFunctions[parseInt(sub)] = new KernelSubFunction(func.prototype.subFunctions[sub]);
                    }
                }
            }
        }
    }
    
    var init = function() {
        setDefaultKernelNames();
        createStubs();
        mapKernelFunctions();
    }
    
    var getKernelFuncName = function(id) {
        return kernelNames[id];
    }

    return {
        init : init,
        kernelFuncs : kernelFuncs,
        getKernelFuncName : getKernelFuncName
    };
})();

/** Default kernel name table. */
var defaultKernelNames = [
	/*0x00*/ "Load",
	/*0x01*/ "UnLoad",
	/*0x02*/ "ScriptID",
	/*0x03*/ "DisposeScript",
	/*0x04*/ "Clone",
	/*0x05*/ "DisposeClone",
	/*0x06*/ "IsObject",
	/*0x07*/ "RespondsTo",
	/*0x08*/ "DrawPic",
	/*0x09*/ "Show",
	/*0x0a*/ "PicNotValid",
	/*0x0b*/ "Animate",
	/*0x0c*/ "SetNowSeen",
	/*0x0d*/ "NumLoops",
	/*0x0e*/ "NumCels",
	/*0x0f*/ "CelWide",
	/*0x10*/ "CelHigh",
	/*0x11*/ "DrawCel",
	/*0x12*/ "AddToPic",
	/*0x13*/ "NewWindow",
	/*0x14*/ "GetPort",
	/*0x15*/ "SetPort",
	/*0x16*/ "DisposeWindow",
	/*0x17*/ "DrawControl",
	/*0x18*/ "HiliteControl",
	/*0x19*/ "EditControl",
	/*0x1a*/ "TextSize",
	/*0x1b*/ "Display",
	/*0x1c*/ "GetEvent",
	/*0x1d*/ "GlobalToLocal",
	/*0x1e*/ "LocalToGlobal",
	/*0x1f*/ "MapKeyToDir",
	/*0x20*/ "DrawMenuBar",
	/*0x21*/ "MenuSelect",
	/*0x22*/ "AddMenu",
	/*0x23*/ "DrawStatus",
	/*0x24*/ "Parse",
	/*0x25*/ "Said",
	/*0x26*/ "SetSynonyms",	// Portrait (KQ6 hires)
	/*0x27*/ "HaveMouse",
	/*0x28*/ "SetCursor",
	// FOpen (SCI0)
	// FPuts (SCI0)
	// FGets (SCI0)
	// FClose (SCI0)
	/*0x29*/ "SaveGame",
	/*0x2a*/ "RestoreGame",
	/*0x2b*/ "RestartGame",
	/*0x2c*/ "GameIsRestarting",
	/*0x2d*/ "DoSound",
	/*0x2e*/ "NewList",
	/*0x2f*/ "DisposeList",
	/*0x30*/ "NewNode",
	/*0x31*/ "FirstNode",
	/*0x32*/ "LastNode",
	/*0x33*/ "EmptyList",
	/*0x34*/ "NextNode",
	/*0x35*/ "PrevNode",
	/*0x36*/ "NodeValue",
	/*0x37*/ "AddAfter",
	/*0x38*/ "AddToFront",
	/*0x39*/ "AddToEnd",
	/*0x3a*/ "FindKey",
	/*0x3b*/ "DeleteKey",
	/*0x3c*/ "Random",
	/*0x3d*/ "Abs",
	/*0x3e*/ "Sqrt",
	/*0x3f*/ "GetAngle",
	/*0x40*/ "GetDistance",
	/*0x41*/ "Wait",
	/*0x42*/ "GetTime",
	/*0x43*/ "StrEnd",
	/*0x44*/ "StrCat",
	/*0x45*/ "StrCmp",
	/*0x46*/ "StrLen",
	/*0x47*/ "StrCpy",
	/*0x48*/ "Format",
	/*0x49*/ "GetFarText",
	/*0x4a*/ "ReadNumber",
	/*0x4b*/ "BaseSetter",
	/*0x4c*/ "DirLoop",
	/*0x4d*/ "CanBeHere",       // CantBeHere in newer SCI versions
	/*0x4e*/ "OnControl",
	/*0x4f*/ "InitBresen",
	/*0x50*/ "DoBresen",
	/*0x51*/ "Platform",        // DoAvoider (SCI0)
	/*0x52*/ "SetJump",
	/*0x53*/ "SetDebug",        // for debugging
	/*0x54*/ "InspectObj",      // for debugging
	/*0x55*/ "ShowSends",       // for debugging
	/*0x56*/ "ShowObjs",        // for debugging
	/*0x57*/ "ShowFree",        // for debugging
	/*0x58*/ "MemoryInfo",
	/*0x59*/ "StackUsage",      // for debugging
	/*0x5a*/ "Profiler",        // for debugging
	/*0x5b*/ "GetMenu",
	/*0x5c*/ "SetMenu",
	/*0x5d*/ "GetSaveFiles",
	/*0x5e*/ "GetCWD",
	/*0x5f*/ "CheckFreeSpace",
	/*0x60*/ "ValidPath",
	/*0x61*/ "CoordPri",
	/*0x62*/ "StrAt",
	/*0x63*/ "DeviceInfo",
	/*0x64*/ "GetSaveDir",
	/*0x65*/ "CheckSaveGame",
	/*0x66*/ "ShakeScreen",
	/*0x67*/ "FlushResources",
	/*0x68*/ "SinMult",
	/*0x69*/ "CosMult",
	/*0x6a*/ "SinDiv",
	/*0x6b*/ "CosDiv",
	/*0x6c*/ "Graph",
	/*0x6d*/ "Joystick",
	// End of kernel function table for SCI0
	/*0x6e*/ "ShiftScreen",     // never called?
	/*0x6f*/ "Palette",
	/*0x70*/ "MemorySegment",
	/*0x71*/ "Intersections",	// MoveCursor (SCI1 late), PalVary (SCI1.1)
	/*0x72*/ "Memory",
	/*0x73*/ "ListOps",         // never called?
	/*0x74*/ "FileIO",
	/*0x75*/ "DoAudio",
	/*0x76*/ "DoSync",
	/*0x77*/ "AvoidPath",
	/*0x78*/ "Sort",            // StrSplit (SCI01)
	/*0x79*/ "ATan",            // never called?
	/*0x7a*/ "Lock",
	/*0x7b*/ "StrSplit",
	/*0x7c*/ "GetMessage",      // Message (SCI1.1)
	/*0x7d*/ "IsItSkip",
	/*0x7e*/ "MergePoly",
	/*0x7f*/ "ResCheck",
	/*0x80*/ "AssertPalette",
	/*0x81*/ "TextColors",
	/*0x82*/ "TextFonts",
	/*0x83*/ "Record",          // for debugging
	/*0x84*/ "PlayBack",        // for debugging
	/*0x85*/ "ShowMovie",
	/*0x86*/ "SetVideoMode",
	/*0x87*/ "SetQuitStr",
	/*0x88*/ "DbugStr"          // for debugging
];

function kGetFarText(args) {
    var textData = ResourceManager.loadText(args[0].toUint16());
    
    if(textData == null) {
        throw VM_LOAD_STALL;
    }

	var counter = args[1].toUint16();
	var str = "";

    for(var x = 0; x<textData.length; x++) {
        var c = textData.charCodeAt(x);
        
        if(c == 0) {
            if(counter == 0)
                break;
            counter --;
        }
        else if(counter == 0) {
            str = str + String.fromCharCode(c);
        }
    }
    
    Debug.log("String number " + args[1].toUint16() + " is " + str);

	// If the third argument is NULL, allocate memory for the destination. This
	// occurs in SCI1 Mac games. The memory will later be freed by the game's
	// scripts.
	if (args[2].isNull())
		args[2].set(SegManager.allocDynmem(str.length + 1, "Mac FarText"));

	SegManager.strcpy(args[2], str); // Copy the string and get return value
	return args[2];
}

function kInitBresen(args) {
	var mover = args[0];
	var client = readSelector(mover, SelectorCache.client);
	var stepFactor = (args.length >= 2) ? args[1].toUint16() : 1;
	var mover_x = readSelectorValueSigned(mover, SelectorCache.x);
	var mover_y = readSelectorValueSigned(mover, SelectorCache.y);
	var client_xStep = readSelectorValueSigned(client, SelectorCache.xStep) * stepFactor;
	var client_yStep = readSelectorValueSigned(client, SelectorCache.yStep) * stepFactor;

	var client_step;
	if (client_xStep < client_yStep)
		client_step = client_yStep * 2;
	else
		client_step = client_xStep * 2;

	var deltaX = mover_x - readSelectorValueSigned(client, SelectorCache.x);
	var deltaY = mover_y - readSelectorValueSigned(client, SelectorCache.y);
	var mover_dx = 0;
	var mover_dy = 0;
	var mover_i1 = 0;
	var mover_i2 = 0;
	var mover_di = 0;
	var mover_incr = 0;
	var mover_xAxis = 0;

	while (1) {
		mover_dx = client_xStep;
		mover_dy = client_yStep;
		mover_incr = 1;

		if (Math.abs(deltaX) >= Math.abs(deltaY)) {
			mover_xAxis = 1;
			if (deltaX < 0)
				mover_dx = -mover_dx;
			mover_dy = deltaX ? mover_dx * parseInt(deltaY / deltaX) : 0;
			mover_i1 = ((mover_dx * deltaY) - (mover_dy * deltaX)) * 2;
			if (deltaY < 0) {
				mover_incr = -1;
				mover_i1 = -mover_i1;
			}
			mover_i2 = mover_i1 - (deltaX * 2);
			mover_di = mover_i1 - deltaX;
			if (deltaX < 0) {
				mover_i1 = -mover_i1;
				mover_i2 = -mover_i2;
				mover_di = -mover_di;
			}
		} else {
			mover_xAxis = 0;
			if (deltaY < 0)
				mover_dy = -mover_dy;
			mover_dx = deltaY ? mover_dy * parseInt(deltaX / deltaY) : 0;
			mover_i1 = ((mover_dy * deltaX) - (mover_dx * deltaY)) * 2;
			if (deltaX < 0) {
				mover_incr = -1;
				mover_i1 = -mover_i1;
			}
			mover_i2 = mover_i1 - (deltaY * 2);
			mover_di = mover_i1 - deltaY;
			if (deltaY < 0) {
				mover_i1 = -mover_i1;
				mover_i2 = -mover_i2;
				mover_di = -mover_di;
			}
			break;
		}
		if (client_xStep <= client_yStep)
			break;
		if (!client_xStep)
			break;
		if (client_yStep >= Math.abs(mover_dy + mover_incr))
			break;

		client_step--;
		if (!client_step)
			Debug.error("kInitBresen failed");
		client_xStep--;
	}

	// set mover
	writeSelectorValue(mover, SelectorCache.dx, mover_dx);
	writeSelectorValue(mover, SelectorCache.dy, mover_dy);
	writeSelectorValue(mover, SelectorCache.b_i1, mover_i1);
	writeSelectorValue(mover, SelectorCache.b_i2, mover_i2);
	writeSelectorValue(mover, SelectorCache.b_di, mover_di);
	writeSelectorValue(mover, SelectorCache.b_incr, mover_incr);
	writeSelectorValue(mover, SelectorCache.b_xAxis, mover_xAxis);
	return VM.state.acc;
}

function kDoBresen(args) {
	var mover = args[0];
	var client = readSelector(mover, SelectorCache.client);
	var completed = false;
	var handleMoveCount = GameFeatures.handleMoveCount();

	if (getSciVersion() >= SciVersion.SCI_VERSION_1_EGA_ONLY) {
		var client_signal = readSelectorValue(client, SelectorCache.signal);
		writeSelectorValue(client, SelectorCache.signal, client_signal & ~ViewSignals.HitObstacle);
	}

	var mover_moveCnt = 1;
	var client_moveSpeed = 0;
	if (handleMoveCount) {
		mover_moveCnt = readSelectorValue(mover, SelectorCache.b_movCnt);
		client_moveSpeed = readSelectorValue(client, SelectorCache.moveSpeed);
		mover_moveCnt++;
	}

	if (client_moveSpeed < mover_moveCnt) {
		mover_moveCnt = 0;
		var client_x = readSelectorValueSigned(client, SelectorCache.x);
		var client_y = readSelectorValueSigned(client, SelectorCache.y);
		var mover_x = readSelectorValueSigned(mover, SelectorCache.x);
		var mover_y = readSelectorValueSigned(mover, SelectorCache.y);
		var mover_xAxis = readSelectorValueSigned(mover, SelectorCache.b_xAxis);
		var mover_dx = readSelectorValueSigned(mover, SelectorCache.dx);
		var mover_dy = readSelectorValueSigned(mover, SelectorCache.dy);
		var mover_incr = readSelectorValueSigned(mover, SelectorCache.b_incr);
		var mover_i1 = readSelectorValueSigned(mover, SelectorCache.b_i1);
		var mover_i2 = readSelectorValueSigned(mover, SelectorCache.b_i2);
		var mover_di = readSelectorValueSigned(mover, SelectorCache.b_di);
		var mover_org_i1 = mover_i1;
		var mover_org_i2 = mover_i2;
		var mover_org_di = mover_di;

		if ((getSciVersion() >= SciVersion.SCI_VERSION_1_EGA_ONLY)) {
			// save current position into mover
			writeSelectorValue(mover, SelectorCache.xLast, client_x);
			writeSelectorValue(mover, SelectorCache.yLast, client_y);
		}

		// Store backups of all client selector variables. We will restore them
		// in case of a collision.
		var clientObject = SegManager.getObject(client);
		var clientVarNum = clientObject.getVarCount();
		var clientBackup = [];
		for (var i = 0; i < clientVarNum; ++i)
			clientBackup[i] = clientObject.getVariable(i);

		if (mover_xAxis) {
			if (Math.abs(mover_x - client_x) < Math.abs(mover_dx))
				completed = true;
		} else {
			if (Math.abs(mover_y - client_y) < Math.abs(mover_dy))
				completed = true;
		}
		if (completed) {
			client_x = mover_x;
			client_y = mover_y;
		} else {
			client_x += mover_dx;
			client_y += mover_dy;
			if (mover_di < 0) {
				mover_di += mover_i1;
			} else {
				mover_di += mover_i2;
				if (mover_xAxis == 0) {
					client_x += mover_incr;
				} else {
					client_y += mover_incr;
				}
			}
		}
		writeSelectorValue(client, SelectorCache.x, client_x);
		writeSelectorValue(client, SelectorCache.y, client_y);

		// Now call client::canBeHere/client::cantBehere to check for collisions
		var collision = false;
		var cantBeHere = new Reg(0, 0);
		var argv = VM.state.xs.sp + 1;

		if (SelectorCache.cantBeHere != -1) {
			// adding this here for hoyle 3 to get happy. CantBeHere is a dummy in hoyle 3 and acc is != 0 so we would
			//  get a collision otherwise
			VM.state.acc = new Reg(0, 0);
			invokeSelector(client, SelectorCache.cantBeHere, args.length, argv, []);
			if (!VM.state.acc.isNull())
				collision = true;
			cantBeHere = VM.state.acc.clone();
		} else {
			invokeSelector(client, SelectorCache.canBeHere, args.length, argv, []);
			if (VM.state.acc.isNull())
				collision = true;
		}

		if (collision) {
			// We restore the backup of the client variables
			for (var i = 0; i < clientVarNum; ++i)
				clientObject.getVariableRef(i).set(clientBackup[i]);

			mover_i1 = mover_org_i1;
			mover_i2 = mover_org_i2;
			mover_di = mover_org_di;

			var client_signal = readSelectorValue(client, SelectorCache.signal);
			writeSelectorValue(client, SelectorCache.signal, client_signal | ViewSignals.HitObstacle);
		}

		writeSelectorValue(mover, SelectorCache.b_i1, mover_i1);
		writeSelectorValue(mover, SelectorCache.b_i2, mover_i2);
		writeSelectorValue(mover, SelectorCache.b_di, mover_di);

		if (getSciVersion() >= SciVersion.SCI_VERSION_1_EGA_ONLY) {
			// In sci1egaonly this block of code was outside of the main if,
			// but client_x/client_y aren't set there, so it was an
			// uninitialized read in SSCI. (This issue was fixed in sci1early.)
			if (handleMoveCount)
				writeSelectorValue(mover, SelectorCache.b_movCnt, mover_moveCnt);
			// We need to compare directly in here, complete may have happened during
			//  the current move
			if ((client_x == mover_x) && (client_y == mover_y))
				invokeSelector(mover, SelectorCache.moveDone, args.length, argv);
			return VM.state.acc;
		}
	}

	if (handleMoveCount)
		writeSelectorValue(mover, SelectorCache.b_movCnt, mover_moveCnt);

	return VM.state.acc;
}

function kSetJump(args) {
	// Input data
	var object = args[0];
	var dx = args[1].toSint16();
	var dy = args[2].toSint16();
	var gy = args[3].toSint16();

	// Derived data
	var c;
	var tmp;
	var vx = 0;  // x velocity
	var vy = 0;  // y velocity

	var dxWasNegative = (dx < 0);
	dx = Math.abs(dx);

	if (dx == 0) {
		// Upward jump. Value of c doesn't really matter
		c = 1;
	} else {
		// Compute a suitable value for c respectively tmp.
		// The important thing to consider here is that we want the resulting
		// *discrete* x/y velocities to be not-too-big integers, for a smooth
		// curve (i.e. we could just set vx=dx, vy=dy, and be done, but that
		// is hardly what you would call a parabolic jump, would ya? ;-).
		//
		// So, we make sure that 2.0*tmp will be bigger than dx (that way,
		// we ensure vx will be less than sqrt(gy * dx)).
		if (dx + dy < 0) {
			// dy is negative and |dy| > |dx|
			c = parseInt((2 * Math.abs(dy)) / dx);
			//tmp = ABS(dy);  // ALMOST the resulting value, except for obvious rounding issues
		} else {
			// dy is either positive, or |dy| <= |dx|
			c = parseInt((dx * 3 / 2 - dy) / dx);

			// We force c to be strictly positive
			if (c < 1)
				c = 1;

			//tmp = dx * 3 / 2;  // ALMOST the resulting value, except for obvious rounding issues

			// FIXME: Where is the 3 coming from? Maybe they hard/coded, by "accident", that usually gy=3 ?
			// Then this choice of scalar will make t equal to roughly sqrt(dx)
		}
	}
	// POST: c >= 1
	tmp = c * dx + dy;
	// POST: (dx != 0)  ==>  ABS(tmp) > ABS(dx)
	// POST: (dx != 0)  ==>  ABS(tmp) ~>=~ ABS(dy)

	//debugC(kDebugLevelBresen, "c: %d, tmp: %d", c, tmp);

	// Compute x step
	if (tmp != 0 && dx != 0)
		vx = parseInt((dx * Math.sqrt(gy / (2.0 * tmp))));
	else
		vx = 0;

	// Restore the left/right direction: dx and vx should have the same sign.
	if (dxWasNegative)
		vx = -vx;

	if ((dy < 0) && (vx == 0)) {
		// Special case: If this was a jump (almost) straight upward, i.e. dy < 0 (upward),
		// and vx == 0 (i.e. no horizontal movement, at least not after rounding), then we
		// compute vy directly.
		// For this, we drop the assumption on the linear correlation of vx and vy (obviously).

		// FIXME: This choice of vy makes t roughly (2+sqrt(2))/gy * sqrt(dy);
		// so if gy==3, then t is roughly sqrt(dy)...
		vy = parseInt(Math.sqrt(gy * Math.abs(2 * dy)) + 1);
	} else {
		// As stated above, the vertical direction is correlated to the horizontal by the
		// (non-zero) factor c.
		// Strictly speaking, we should probably be using the value of vx *before* rounding
		// it to an integer... Ah well
		vy = c * vx;
	}

	// Always force vy to be upwards
	vy = -Math.abs(vy);

	//debugC(kDebugLevelBresen, "SetJump for object at %04x:%04x", PRINT_REG(object));
	//debugC(kDebugLevelBresen, "xStep: %d, yStep: %d", vx, vy);

	writeSelectorValue(object, SelectorCache.xStep, vx);
	writeSelectorValue(object, SelectorCache.yStep, vy);

	return VM.state.acc;
}
function kGraph(args) {
    return new Reg(0, 0);
}

function kGraphGetColorCount(args) {
    // TODO non-EGA games!
    return new Reg(0, 16);
}

kGraph.prototype = {
    subFunctions : {
        0 : createStubFunction("GraphStub0"),
        1 : createStubFunction("GraphStub1"),
        2 : kGraphGetColorCount,
        3 : createStubFunction("GraphStub3"),
        4 : createStubFunction("GraphStub4"),
        5 : createStubFunction("GraphStub5"),
        6 : createStubFunction("GraphStub6"),
        7 : createStubFunction("GraphStub7"),
        8 : createStubFunction("GraphStub8"),
        9 : createStubFunction("GraphStub9"),
        10 : createStubFunction("GraphStub10"),
        11 : createStubFunction("GraphStub11"),
        12 : createStubFunction("GraphStub12"),
        13 : createStubFunction("GraphStub13"),
        14 : createStubFunction("GraphStub14"),
        15 : createStubFunction("GraphStub15"),
    }
};

// TODO
function kAnimate(args) {
    var castListReference = (args.length > 0) ? args[0] : new Reg(0, 0);
	var cycle = (args.length > 1) ? ((args[1].toUint16()) ? true : false) : false;
	
	GfxAnimate.kernelAnimate(castListReference, cycle, args);
	//Debug.warn("Animating: list: " + castListReference.toString() + " cycle: " + cycle);
	
	return VM.state.acc;
}

// TODO
function kDrawPic(args) {
	var pictureId = args[0].toUint16();

    var img = ResourceManager.loadPic(pictureId);
    
    if(img != null) {
        /*for(var x = 0; x<16; x++) {
            Screen.getContext().drawImage(img, x * 320, 0, 320, 200, 0, 0, 320, 200);
        }*/
        GfxScreen.drawPic(img);
    }
    else {
        throw VM_LOAD_STALL;
    }
    
    return VM.state.acc;
}

function canBeHereCheckRectList(checkObject, checkRect, list) {
	var curAddress = list.first;
	var curNode = SegManager.lookupNode(curAddress);
	var curObject;
	var signal;
	var curRect = new Rect();

	while (curNode != null) {
		curObject = curNode.value;
		if (curObject != checkObject) {
			signal = readSelectorValue(curObject, SelectorCache.signal);
			if (!(signal & (ViewSignals.IgnoreActor | ViewSignals.RemoveView | ViewSignals.NoUpdate))) {
				curRect.left = readSelectorValueSigned(curObject, SelectorCache.brLeft);
				curRect.top = readSelectorValueSigned(curObject, SelectorCache.brTop);
				curRect.right = readSelectorValueSigned(curObject, SelectorCache.brRight);
				curRect.bottom = readSelectorValueSigned(curObject, SelectorCache.brBottom);
				// Check if curRect is within checkRect
				// This behavior is slightly odd, but it's how the original SCI
				// engine did it: a rect cannot be contained within itself
				// (there is no equality). Do NOT change this to contains(), as
				// it breaks KQ4 early (bug #3315639).
				if (curRect.right > checkRect.left &&
					curRect.left < checkRect.right &&
					curRect.bottom > checkRect.top &&
					curRect.top < checkRect.bottom)
					return curObject;
			}
		}
		curAddress = curNode.succ;
		curNode = SegManager.lookupNode(curAddress);
	}
	return new Reg(0, 0);
}

// TODO
function kernelCanBeHere(curObject, listReference) {
    var checkRect = new Rect();
	var adjustedRect = new Rect();
	var signal, controlMask;
	var result;

	checkRect.left = readSelectorValueSigned(curObject, SelectorCache.brLeft);
	checkRect.top = readSelectorValueSigned(curObject, SelectorCache.brTop);
	checkRect.right = readSelectorValueSigned(curObject, SelectorCache.brRight);
	checkRect.bottom = readSelectorValueSigned(curObject, SelectorCache.brBottom);

	if (!checkRect.isValidRect()) {	// can occur in Iceman and Mother Goose - HACK? TODO: is this really occuring in sierra sci? check this
		Debug.warn("kCan(t)BeHere - invalid rect!");
		return new Reg(0, 0); // this means "can be here"
	}

	adjustedRect = adjustOnControl(checkRect);

	signal = readSelectorValue(curObject, SelectorCache.signal);
	controlMask = readSelectorValue(curObject, SelectorCache.illegalBits);
	result = isOnControl(GfxScreenMasks.CONTROL, adjustedRect) & controlMask;
	if ((!result) && (signal & (ViewSignals.IgnoreActor | ViewSignals.RemoveView)) == 0) {
		var list = SegManager.lookupList(listReference);
		if (list == null)
			Debug.error("kCanBeHere called with non-list as parameter");

		return canBeHereCheckRectList(curObject, checkRect, list);
	}
	return new Reg(0, result);
}

function kCanBeHere(args) {
	var curObject = args[0];
	var listReference = (args.length > 1) ? args[1] : new Reg(0, 0);

    return new Reg(0, 1);

	var canBeHere = kernelCanBeHere(curObject, listReference);
	
    return new Reg(0, canBeHere.isNull() ? 1 : 0);
}


function kNumLoops(args) {
	var object = args[0];
	var viewId = readSelectorValue(object, SelectorCache.view);
	var loopCount;

    var view = ResourceManager.loadView(viewId);
    
    if(view == null) {
        throw VM_LOAD_STALL;
    }

	loopCount = view.getLoopCount();

	return new Reg(0, loopCount);
}

function kNumCels(args) {
	var object = args[0];
	var viewId = readSelectorValue(object, SelectorCache.view);
	var loopNo = readSelectorValueSigned(object, SelectorCache.loop);
	var celCount = 1;

    var view = ResourceManager.loadView(viewId);
    
    if(view == null) {
        throw VM_LOAD_STALL;
    }
    
    celCount = view.getNumCels(loopNo);
	//celCount = g_sci->_gfxCache->kernelViewGetCelCount(viewId, loopNo);

//	debugC(kDebugLevelGraphics, "NumCels(view.%d, %d) = %d", viewId, loopNo, celCount);
    Debug.log("KGraphics", "NumCels(view." + viewId + ", " + loopNo + ") = " + celCount);

	return new Reg(0, celCount);
}

function kBaseSetter(args) {
    var object = args[0];

    if (lookupSelector(object, SelectorCache.brLeft, null, null) == SelectorType.Variable) {
		var x = readSelectorValueSigned(object, SelectorCache.x);
		var y = readSelectorValueSigned(object, SelectorCache.y);
		var z = (SelectorCache.z > -1) ? readSelectorValueSigned(object, SelectorCache.z) : 0;
		var yStep = readSelectorValueSigned(object, SelectorCache.yStep);
		var viewId = readSelectorValue(object, SelectorCache.view);
		var loopNo = readSelectorValueSigned(object, SelectorCache.loop);
		var celNo = readSelectorValueSigned(object, SelectorCache.cel);

		// HACK: Ignore invalid views for now (perhaps unimplemented text views?)
		if (viewId == 0xFFFF)	// invalid view
			return VM.state.acc;

		var scaleSignal = 0;
		if (getSciVersion() >= SciVersion.SCI_VERSION_1_1) {
			scaleSignal = readSelectorValue(_segMan, object, SelectorCache.scaleSignal);
		}

		var celRect = new Rect();

		var tmpView = ResourceManager.loadView(viewId);
		
		if(tmpView == null) {
		    throw VM_LOAD_STALL;
		}
		
		if (!tmpView.isScaleable())
			scaleSignal = 0;

		if (scaleSignal & ViewScaleSignals.DoScaling) {
			//celRect = getNSRect(object);
		} else {
			if (tmpView.isSci2Hires())
				tmpView.adjustToUpscaledCoordinates(y, x);

			tmpView.getCelRect(loopNo, celNo, x, y, z, celRect);

			if (tmpView.isSci2Hires()) {
				tmpView.adjustBackUpscaledCoordinates(celRect.top, celRect.left);
				tmpView.adjustBackUpscaledCoordinates(celRect.bottom, celRect.right);
			}
		}

		celRect.bottom = y + 1;
		celRect.top = celRect.bottom - yStep;

		writeSelectorValue(object, SelectorCache.brLeft, celRect.left);
		writeSelectorValue(object, SelectorCache.brRight, celRect.right);
		writeSelectorValue(object, SelectorCache.brTop, celRect.top);
		writeSelectorValue(object, SelectorCache.brBottom, celRect.bottom);
	}

    return VM.state.acc;
}

function kDirLoop(args) {
    kDirLoopWorker(args[0], args[1].toUint16(), args);

	return VM.state.acc;
}

function kDirLoopWorker(object, angle, args) {
	var viewId = readSelectorValue(object, SelectorCache.view);
	var signal = readSelectorValue(object, SelectorCache.signal);

	if ((signal & ViewSignals.DoesntTurn) != 0)
		return;

	var useLoop = -1;
	if (getSciVersion() > SciVersion.SCI_VERSION_0_EARLY) {
		if ((angle > 315) || (angle < 45)) {
			useLoop = 3;
		} else if ((angle > 135) && (angle < 225)) {
			useLoop = 2;
		}
	} else {
		// SCI0EARLY
		if ((angle > 330) || (angle < 30)) {
			useLoop = 3;
		} else if ((angle > 150) && (angle < 210)) {
			useLoop = 2;
		}
	}
	if (useLoop == -1) {
		if (angle >= 180) {
			useLoop = 1;
		} else {
			useLoop = 0;
		}
	} else {
	    var view = ResourceManager.loadView(viewId);
	    if(view == null) {
	        throw VM_LOAD_STALL;
	    }
		var loopCount = view.getLoopCount();
		if (loopCount < 4)
			return;
	}

	writeSelectorValue(object, SelectorCache.loop, useLoop);
}

// TODO
function strSplit(text) {
    return text;
}

// TODO
function lookupText(address, index) {
	var seeker;
	var textres;

	if (address.segment != 0)
		return SegManager.getString(address);

	var textlen;
	var _index = index;
	textres = ResourceManager.loadText(address.offset);
	
	if(textres == null)
	    throw VM_LOAD_STALL;

	textlen = textres.length;
	seeker = 0;

    return textres.substr(index);

/*	while (index--)
		while ((textlen--) && (textres.charCodeAt(seeker++) != 0))
			;

	if (textlen > 0)
		return seeker;

	Debug.error("Index " + _index + " out of bounds in text." + address.offset);
	return "";*/
}


function kDisplay(args) {
	var textp = args[0];
	var index = (args.length > 1) ? args[1].toUint16() : 0;

	var text;

	if (textp.segment != 0) {
	    args.shift();
		text = SegManager.getString(textp);
	} else {
		args.shift(); 		
		args.shift();
		text = lookupText(textp, index);
	}
	
/*	if(text == VM_LOAD_STALL) {
	    throw VM_LOAD_STALL;
	}*/
	
	Debug.log("Display: " + text);

	return kernelDisplay(strSplit(text), args);
}

function kernelDisplay(text, args) {
	var displayArg = new Reg(0, 0);
	var alignment = SCI_TEXT16_ALIGNMENT_LEFT;
	var colorPen = -1, colorBack = -1, width = -1, bRedraw = 1;
	var doSaveUnder = false;
	var rect = new Rect();
	var result = new Reg(0, 0);

	// Make a "backup" of the port settings (required for some SCI0LATE and
	// SCI01+ only)
/*	Port oldPort = *_ports->getPort();

	// setting defaults
	_ports->penMode(0);
	_ports->penColor(0);
	_ports->textGreyedOutput(false);
	// processing codes in argv
	while (argc > 0) {
		displayArg = argv[0];
		if (displayArg.segment)
			displayArg.offset = 0xFFFF;
		argc--; argv++;
		switch (displayArg.offset) {
		case SCI_DISPLAY_MOVEPEN:
			_ports->moveTo(argv[0].toUint16(), argv[1].toUint16());
			argc -= 2; argv += 2;
			break;
		case SCI_DISPLAY_SETALIGNMENT:
			alignment = argv[0].toSint16();
			argc--; argv++;
			break;
		case SCI_DISPLAY_SETPENCOLOR:
			colorPen = argv[0].toUint16();
			_ports->penColor(colorPen);
			argc--; argv++;
			break;
		case SCI_DISPLAY_SETBACKGROUNDCOLOR:
			colorBack = argv[0].toUint16();
			argc--; argv++;
			break;
		case SCI_DISPLAY_SETGREYEDOUTPUT:
			_ports->textGreyedOutput(argv[0].isNull() ? false : true);
			argc--; argv++;
			break;
		case SCI_DISPLAY_SETFONT:
			_text16->SetFont(argv[0].toUint16());
			argc--; argv++;
			break;
		case SCI_DISPLAY_WIDTH:
			width = argv[0].toUint16();
			argc--; argv++;
			break;
		case SCI_DISPLAY_SAVEUNDER:
			doSaveUnder = true;
			break;
		case SCI_DISPLAY_RESTOREUNDER:
			bitsGetRect(argv[0], &rect);
			rect.translate(-_ports->getPort()->left, -_ports->getPort()->top);
			bitsRestore(argv[0]);
			kernelGraphRedrawBox(rect);
			// finishing loop
			argc = 0;
			break;
		case SCI_DISPLAY_DONTSHOWBITS:
			bRedraw = 0;
			break;

		// The following three dummy calls are not supported by the Sierra SCI
		// interpreter, but are erroneously called in some game scripts.
		case SCI_DISPLAY_DUMMY1:	// Longbow demo (all rooms) and QFG1 EGA demo (room 11)
		case SCI_DISPLAY_DUMMY2:	// Longbow demo (all rooms)
		case SCI_DISPLAY_DUMMY3:	// QFG1 EGA demo (room 11) and PQ2 (room 23)
			if (!(g_sci->getGameId() == GID_LONGBOW && g_sci->isDemo()) &&
				!(g_sci->getGameId() == GID_QFG1    && g_sci->isDemo()) &&
				!(g_sci->getGameId() == GID_PQ2))
				error("Unknown kDisplay argument %d", displayArg.offset);

			if (displayArg.offset == SCI_DISPLAY_DUMMY2) {
				if (!argc)
					error("No parameter left for kDisplay(115)");
				argc--; argv++;
			}
			break;
		default:
			SciTrackOriginReply originReply;
			SciWorkaroundSolution solution = trackOriginAndFindWorkaround(0, kDisplay_workarounds, &originReply);
			if (solution.type == WORKAROUND_NONE)
				error("Unknown kDisplay argument (%04x:%04x) from method %s::%s (script %d, localCall %x)", 
						PRINT_REG(displayArg), originReply.objectName.c_str(), originReply.methodName.c_str(), 
						originReply.scriptNr, originReply.localCallOffset);
			assert(solution.type == WORKAROUND_IGNORE);
			break;
		}
	}
*/
/*
	// now drawing the text
	_text16->Size(rect, text, -1, width);
	rect.moveTo(_ports->getPort()->curLeft, _ports->getPort()->curTop);
	// Note: This code has been found in SCI1 middle and newer games. It was
	// previously only for SCI1 late and newer, but the LSL1 interpreter contains
	// this code.
	if (getSciVersion() >= SCI_VERSION_1_MIDDLE) {
		int16 leftPos = rect.right <= _screen->getWidth() ? 0 : _screen->getWidth() - rect.right;
		int16 topPos = rect.bottom <= _screen->getHeight() ? 0 : _screen->getHeight() - rect.bottom;
		_ports->move(leftPos, topPos);
		rect.moveTo(_ports->getPort()->curLeft, _ports->getPort()->curTop);
	}

	if (doSaveUnder)
		result = bitsSave(rect, GFX_SCREEN_MASK_VISUAL);
	if (colorBack != -1)
		fillRect(rect, GFX_SCREEN_MASK_VISUAL, colorBack, 0, 0);
	_text16->Box(text, false, rect, alignment, -1);
	if (_screen->_picNotValid == 0 && bRedraw)
		bitsShow(rect);
	// restoring port and cursor pos
	Port *currport = _ports->getPort();
	uint16 tTop = currport->curTop;
	uint16 tLeft = currport->curLeft;
	if (!g_sci->_features->usesOldGfxFunctions()) {
		// Restore port settings for some SCI0LATE and SCI01+ only.
		//
		// The change actually happened inbetween .530 (hoyle1) and .566 (heros
		// quest). We don't have any detection for that currently, so we are
		// using oldGfxFunctions (.502). The only games that could get
		// regressions because of this are hoyle1, kq4 and funseeker. If there
		// are regressions, we should use interpreter version (which would
		// require exe version detection).
		//
		// If we restore the port for whole SCI0LATE, at least sq3old will get
		// an issue - font 0 will get used when scanning for planets instead of
		// font 600 - a setfont parameter is missing in one of the kDisplay
		// calls in script 19. I assume this is a script bug, because it was
		// added in sq3new.
		*currport = oldPort;
	}
	currport->curTop = tTop;
	currport->curLeft = tLeft;
	return result;*/
	
	return new Reg(0, 0);
}


/*function kDrawMenuBar(args) {
    var clear = args[0].isNull() ? true : false;

	g_sci->_gfxMenu->kernelDrawMenuBar(clear);
	return VM.state.acc;
}*/

function adjustOnControl(rect) {
	var oldPort = GfxPorts.setPort(GfxPorts.picWind());
	var adjustedRect = rect.clone();

	adjustedRect.clip(GfxPorts.getPort().rect);
	GfxPorts.offsetRect(adjustedRect);
	GfxPorts.setPort(oldPort);
	return adjustedRect;
}

function kernelOnControl(screenMask, rect) {
    var adjustedRect = adjustOnControl(rect);
    return isOnControl(screenMask, adjustedRect);
}

function isOnControl(screenMask, rect) {
	var x, y;
	var result = 0;

	if (rect.isEmpty())
		return 0;

	if (screenMask & GfxScreenMasks.PRIORITY) {
		for (y = rect.top; y < rect.bottom; y++) {
			for (x = rect.left; x < rect.right; x++) {
				result |= 1 << GfxScreen.getPriority(x, y);
			}
		}
	} else {
		for (y = rect.top; y < rect.bottom; y++) {
			for (x = rect.left; x < rect.right; x++) {
				result |= 1 << GfxScreen.getControl(x, y);
			}
		}
	}
	return result;    
}

function kOnControl(args) {
	var rect = new Rect();
	var screenMask;
	var argBase = 0;

	if ((args.length == 2) || (args.length == 4)) {
		screenMask = GfxScreenMasks.CONTROL;
	} else {
		screenMask = args[0].toUint16();
		argBase = 1;
	}
	rect.left = args[argBase].toSint16();
	rect.top = args[argBase + 1].toSint16();
	if (args > 3) {
		rect.right = args[argBase + 2].toSint16();
		rect.bottom = args[argBase + 3].toSint16();
	} else {
		rect.right = rect.left + 1;
		rect.bottom = rect.top + 1;
	}
	var result = kernelOnControl(screenMask, rect);
	return new Reg(0, result);
}
function kGetDistance(args) {
	var xdiff = (args.length > 3) ? args[3].toSint16() : 0;
	var ydiff = (args.length > 2) ? args[2].toSint16() : 0;
	var angle = (args.length > 5) ? args[5].toSint16() : 0;
	var xrel = parseInt((args[1].toSint16() - xdiff) / Math.cos(angle * Math.PI / 180.0)); // This works because cos(0)==1
	var yrel = args[0].toSint16() - ydiff;
	return new Reg(0, parseInt(Math.sqrt(xrel*xrel + yrel*yrel)));
}

function kGetAngleWorker(x1, y1, x2, y2) {
	var xRel = x2 - x1;
	var yRel = y1 - y2; // y-axis is mirrored.
	var angle;

	// Move (xrel, yrel) to first quadrant.
	if (y1 < y2)
		yRel = -yRel;
	if (x2 < x1)
		xRel = -xRel;

	// Compute angle in grads.
	if (yRel == 0 && xRel == 0)
		return 0;
	else
		angle = 100 * xRel / (xRel + yRel);

	// Fix up angle for actual quadrant of (xRel, yRel).
	if (y1 < y2)
		angle = 200 - angle;
	if (x2 < x1)
		angle = 400 - angle;

	// Convert from grads to degrees by merging grad 0 with grad 1,
	// grad 10 with grad 11, grad 20 with grad 21, etc. This leads to
	// "degrees" that equal either one or two grads.
	angle -= (angle + 9) / 10;
	return angle;
}


function kGetAngle(args) {
	// Based on behavior observed with a test program created with
	// SCI Studio.
	var x1 = args[0].toSint16();
	var y1 = args[1].toSint16();
	var x2 = args[2].toSint16();
	var y2 = args[3].toSint16();

	return new Reg(0, kGetAngleWorker(x1, y1, x2, y2));
}

function kAbs(args) {
	return new Reg(0, Math.abs(args[0].toSint16()));
}

function kSqrt(args) {
	return new Reg(0, parseInt(Math.sqrt(Math.abs(args[0].toSint16()))));
}

function kTimesSin(args) {
	var angle = args[0].toSint16();
	var factor = args[1].toSint16();

	return new Reg(0, parseInt(factor * Math.sin(angle * Math.PI / 180.0)));
}

function kSinMult(args) { return kTimesSin(args); }

function kTimesCos(args) {
	var angle = args[0].toSint16();
	var factor = args[1].toSint16();

	return new Reg(0, parseInt(factor * Math.cos(angle * Math.PI / 180.0)));
}

function kCosMult(args) { return kTimesCos(args); }

function kCosDiv(args) {
	var angle = args[0].toSint16();
	var value = args[1].toSint16();
	
	var cosval = Math.cos(angle * Math.PI / 180.0);

	if ((cosval < 0.0001) && (cosval > -0.0001)) {
		Debug.error("kCosDiv: Attempted division by zero");
		return new Reg(0, 0xffff);
	} else
		return new Reg(0, parseInt(value / cosval));
}

function kSinDiv(args) {
	var angle = args[0].toSint16();
	var value = args[1].toSint16();
	var sinval = Math.sin(angle * Math.PI / 180.0);

	if ((sinval < 0.0001) && (sinval > -0.0001)) {
		Debug.error("kSinDiv: Attempted division by zero");
		return new Reg(0, 0xffff);
	} else
		return new Reg(0, parseInt(value / sinval));
}

function kTimesTan(args) {
	var param = args[0].toSint16();
	var scale = (args.length > 1) ? args[1].toSint16() : 1;

	param -= 90;
	if ((param % 90) == 0) {
		Debug.error("kTimesTan: Attempted tan(pi/2)");
		return new Reg(0, 0xffff);
	} else
		return new Reg(0, - parseInt(Math.tan(param * Math.PI / 180.0) * scale));
}

function kTimesCot(args) {
	var param = args[0].toSint16();
	var scale = (args.length > 1) ? args[1].toSint16() : 1;

	if ((param % 90) == 0) {
		Debug.error("kTimesCot: Attempted tan(pi/2)");
		return new Reg(0, 0xffff);
	} else
		return new Reg(0, parseInt(Math.tan(param * Math.PI / 180.0) * scale));
}
var SCI_EVENT_NONE = 0;
var SCI_EVENT_MOUSE_PRESS =    (1<<0)
var SCI_EVENT_MOUSE_RELEASE =  (1<<1)
var SCI_EVENT_KEYBOARD =       (1<<2)
var SCI_EVENT_DIRECTION =      (1<<6)
var SCI_EVENT_SAID =           (1<<7)

var SCI_KEY_HOME = (71 << 8)	// 7
var SCI_KEY_UP = (72 << 8)		// 8
var SCI_KEY_PGUP = (73 << 8)	// 9
//
var SCI_KEY_LEFT = (75 << 8)	// 4
var SCI_KEY_CENTER = (76 << 8)	// 5
var SCI_KEY_RIGHT = (77 << 8)	// 6
//
var SCI_KEY_END = (79 << 8)		// 1
var SCI_KEY_DOWN = (80 << 8)	// 2
var SCI_KEY_PGDOWN = (81 << 8)	// 3

function mapKey(key) {
    switch(key) {
        case Input.left:
            return SCI_KEY_LEFT;
        case Input.right:
            return SCI_KEY_RIGHT;
        case Input.up:
            return SCI_KEY_UP;
        case Input.down:
            return SCI_KEY_DOWN;
        default:
            return key;
    }
}

function SciEvent() {
	this.type = 0;
	this.data = 0;
	this.modifiers = 0;
	/**
	 * For keyboard events: 'data' after applying
	 * the effects of 'modifiers', e.g. if
	 *   type == SCI_EVT_KEYBOARD
	 *   data == 'a'
	 *   buckybits == SCI_EVM_LSHIFT
	 * then
	 *   character == 'A'
	 * For 'Alt', characters are interpreted by their
	 * PC keyboard scancodes.
	 */
	this.character = SCI_KEY_LEFT;

	/**
	 * The mouse position at the time the event was created.
	 *
	 * These are display coordinates!
	 */
	this.mousePos = new Point();
};

function kGetEvent(args) {
	var mask = args[0].toUint16();
	var obj = args[1];
	var curEvent = new SciEvent();
//	var modifier_mask = getSciVersion() <= SciVersion.SCI_VERSION_01 ? SCI_KEYMOD_ALL : SCI_KEYMOD_NO_FOOLOCK;
	var mousePos = new Point();

	// For Mac games with an icon bar, handle possible icon bar events first
/*	if (g_sci->hasMacIconBar()) {
		reg_t iconObj = g_sci->_gfxMacIconBar->handleEvents();
		if (!iconObj.isNull())
			invokeSelector(s, iconObj, SELECTOR(select), argc, argv, 0, NULL);
	}
*/
	// If there's a simkey pending, and the game wants a keyboard event, use the
	// simkey instead of a normal event
	/*if (g_debug_simulated_key && (mask & SCI_EVENT_KEYBOARD)) {
		// In case we use a simulated event we query the current mouse position
		mousePos = g_sci->_gfxCursor->getPosition();
#ifdef ENABLE_SCI32
		if (getSciVersion() >= SCI_VERSION_2_1)
			g_sci->_gfxCoordAdjuster->fromDisplayToScript(mousePos.y, mousePos.x);
#endif
		// Limit the mouse cursor position, if necessary
		g_sci->_gfxCursor->refreshPosition();

		writeSelectorValue(segMan, obj, SELECTOR(type), SCI_EVENT_KEYBOARD); // Keyboard event
		writeSelectorValue(segMan, obj, SELECTOR(message), g_debug_simulated_key);
		writeSelectorValue(segMan, obj, SELECTOR(modifiers), SCI_KEYMOD_NUMLOCK); // Numlock on
		writeSelectorValue(segMan, obj, SELECTOR(x), mousePos.x);
		writeSelectorValue(segMan, obj, SELECTOR(y), mousePos.y);
		g_debug_simulated_key = 0;
		return make_reg(0, 1);
	}*/

	//curEvent = g_sci->getEventManager()->getSciEvent(mask);

	// For a real event we use its associated mouse position
	/*mousePos = curEvent.mousePos;
#ifdef ENABLE_SCI32
	if (getSciVersion() >= SCI_VERSION_2_1)
		g_sci->_gfxCoordAdjuster->fromDisplayToScript(mousePos.y, mousePos.x);
#endif
	// Limit the mouse cursor position, if necessary
	g_sci->_gfxCursor->refreshPosition();

	if (g_sci->getVocabulary())
		g_sci->getVocabulary()->parser_event = NULL_REG; // Invalidate parser event

	if (s->_cursorWorkaroundActive) {
		// ffs: GfxCursor::setPosition()
		// we check, if actual cursor position is inside given rect
		//  if that's the case, we switch ourself off. Otherwise
		//  we simulate the original set position to the scripts
		if (s->_cursorWorkaroundRect.contains(mousePos.x, mousePos.y)) {
			s->_cursorWorkaroundActive = false;
		} else {
			mousePos.x = s->_cursorWorkaroundPoint.x;
			mousePos.y = s->_cursorWorkaroundPoint.y;
		}
	}*/
	
	var mousePos = Input.getMousePosition();

	writeSelectorValue(obj, SelectorCache.x, mousePos.x);
	writeSelectorValue(obj, SelectorCache.y, mousePos.y);

	//s->_gui->moveCursor(s->gfx_state->pointer_pos.x, s->gfx_state->pointer_pos.y);

	/*switch (curEvent.type) {
	case SCI_EVENT_QUIT:
		s->abortScriptProcessing = kAbortQuitGame; // Terminate VM
		g_sci->_debugState.seeking = kDebugSeekNothing;
		g_sci->_debugState.runningStep = 0;
		break;

	case SCI_EVENT_KEYBOARD:
		writeSelectorValue(segMan, obj, SELECTOR(type), SCI_EVENT_KEYBOARD); // Keyboard event
		s->r_acc = make_reg(0, 1);

		writeSelectorValue(segMan, obj, SELECTOR(message), curEvent.character);
		// We only care about the translated character
		writeSelectorValue(segMan, obj, SELECTOR(modifiers), curEvent.modifiers & modifier_mask);
		break;

	case SCI_EVENT_MOUSE_RELEASE:
	case SCI_EVENT_MOUSE_PRESS:

		// track left buttton clicks, if requested
		if (curEvent.type == SCI_EVENT_MOUSE_PRESS && curEvent.data == 1 && g_debug_track_mouse_clicks) {
			g_sci->getSciDebugger()->DebugPrintf("Mouse clicked at %d, %d\n",
						mousePos.x, mousePos.y);
		}

		if (mask & curEvent.type) {
			int extra_bits = 0;

			switch (curEvent.data) {
			case 2:
				extra_bits = SCI_KEYMOD_LSHIFT | SCI_KEYMOD_RSHIFT;
				break;
			case 3:
				extra_bits = SCI_KEYMOD_CTRL;
			default:
				break;
			}

			writeSelectorValue(segMan, obj, SELECTOR(type), curEvent.type);
			writeSelectorValue(segMan, obj, SELECTOR(message), 0);
			writeSelectorValue(segMan, obj, SELECTOR(modifiers), (curEvent.modifiers | extra_bits) & modifier_mask);
			s->r_acc = make_reg(0, 1);
		}
		break;

	default:*/ {
		// Return a null event
		writeSelectorValue(obj, SelectorCache.type, SCI_EVENT_NONE);
		writeSelectorValue(obj, SelectorCache.message, 0);
		writeSelectorValue(obj, SelectorCache.modifiers, 0);
//		writeSelectorValue(obj, SelectorCache.modifiers, curEvent.modifiers & modifier_mask);
		VM.state.acc = new Reg(0, 0);
	}

/*	if ((s->r_acc.offset) && (g_sci->_debugState.stopOnEvent)) {
		g_sci->_debugState.stopOnEvent = false;

		// A SCI event occurred, and we have been asked to stop, so open the debug console
		Console *con = g_sci->getSciDebugger();
		con->DebugPrintf("SCI event occurred: ");
		switch (curEvent.type) {
		case SCI_EVENT_QUIT:
			con->DebugPrintf("quit event\n");
			break;
		case SCI_EVENT_KEYBOARD:
			con->DebugPrintf("keyboard event\n");
			break;
		case SCI_EVENT_MOUSE_RELEASE:
		case SCI_EVENT_MOUSE_PRESS:
			con->DebugPrintf("mouse click event\n");
			break;
		default:
			con->DebugPrintf("unknown or no event (event type %d)\n", curEvent.type);
		}

		con->attach();
		con->onFrame();
	}
*/
	/*if (g_sci->_features->detectDoSoundType() <= SCI_VERSION_0_LATE) {
		// If we're running a sound-SCI0 game, update the sound cues, to
		// compensate for the fact that sound-SCI0 does not poll to update
		// the sound cues itself, like sound-SCI1 and later do with
		// cmdUpdateSoundCues. kGetEvent is called quite often, so emulate
		// the sound-SCI1 behavior of cmdUpdateSoundCues with this call
		g_sci->_soundCmd->updateSci0Cues();
	}*/

	// Wait a bit here, so that the CPU isn't maxed out when the game
	// is waiting for user input (e.g. when showing text boxes) - bug
	// #3037874. Make sure that we're not delaying while the game is
	// benchmarking, as that will affect the final benchmarked result -
	// check bugs #3058865 and #3127824
/*	if (s->_gameIsBenchmarking) {
		// Game is benchmarking, don't add a delay
	} else {
		g_system->delayMillis(10);
	}
*/
    var ev = Input.getEvent();
    
    if(ev != null) {
        if(ev.type == "keydown") {
            writeSelectorValue(obj, SelectorCache.type, SCI_EVENT_KEYBOARD); // Keyboard event
            VM.state.acc = new Reg(0, 1);
    
            writeSelectorValue(obj, SelectorCache.message, mapKey(ev.keyCode));
            // We only care about the translated character
            writeSelectorValue(obj, SelectorCache.modifiers, 0x0);
        }
        else if(ev.type == "mousedown") {
            writeSelectorValue(obj, SelectorCache.type, SCI_EVENT_MOUSE_PRESS);
            writeSelectorValue(obj, SelectorCache.message, 0);
            writeSelectorValue(obj, SelectorCache.modifiers, 0x0);
            VM.state.acc = new Reg(0, 1);
        }
        else if(ev.type == "mouseup") {
            writeSelectorValue(obj, SelectorCache.type, SCI_EVENT_MOUSE_RELEASE);
            writeSelectorValue(obj, SelectorCache.message, 0);
            writeSelectorValue(obj, SelectorCache.modifiers, 0x0);
            VM.state.acc = new Reg(0, 1);
        }
        else Debug.log(ev);
       // Debug.log(ev);
    }
/*    if(Input.getKey(Input.up)) {
		writeSelectorValue(obj, SelectorCache.type, SCI_EVENT_KEYBOARD); // Keyboard event
		VM.state.acc = new Reg(0, 1);

		writeSelectorValue(obj, SelectorCache.message, curEvent.character);
		// We only care about the translated character
		writeSelectorValue(obj, SelectorCache.modifiers, 0x0);
    }
    
    if(Input.getKey(Input.left)) {
        // track left buttton clicks, if requested
        writeSelectorValue(obj, SelectorCache.type, SCI_EVENT_MOUSE_PRESS);
        writeSelectorValue(obj, SelectorCache.message, 0);
        writeSelectorValue(obj, SelectorCache.modifiers, 0xFF);
        VM.state.acc = new Reg(0, 1);
    }*/

	return VM.state.acc;
}

function kernelGlobalToLocal(coord, planeObject) {
	var curPort = GfxPorts.getPort();
	coord.x -= curPort.left;
	coord.y -= curPort.top;
}

function kernelLocalToGlobal(coord, planeObject) {
	var curPort = GfxPorts.getPort();
	coord.x += curPort.left;
	coord.y += curPort.top;
}

function kGlobalToLocal(args) {
	var obj = args[0];
	var planeObject = args.length > 1 ? args[1] : new Reg(0, 0); // SCI32

	if (obj.segment != 0) {
		var coord = 
		{
			x : readSelectorValueSigned(obj, SelectorCache.x),
			y : readSelectorValueSigned(obj, SelectorCache.y)
		};

        kernelGlobalToLocal(coord, planeObject);

		writeSelectorValue(obj, SelectorCache.x, coord.x);
		writeSelectorValue(obj, SelectorCache.y, coord.y);
	}

	return VM.state.acc;

}

var keyToDirMap = [
	{ key: SCI_KEY_HOME, dir : 8 }, 
	{ key: SCI_KEY_UP, dir : 1},
	{ key: SCI_KEY_PGUP, dir : 2},
	{ key: SCI_KEY_LEFT, dir : 7},
	{ key: SCI_KEY_CENTER, dir : 0}, 
	{ key: SCI_KEY_RIGHT, dir : 3},
	{ key: SCI_KEY_END, dir :  6},
	{ key: SCI_KEY_DOWN, dir :  5},
	{ key: SCI_KEY_PGDOWN, dir : 4}
];

function kMapKeyToDir(args) {
	var obj = args[0];

	if (readSelectorValue(obj, SelectorCache.type) == SCI_EVENT_KEYBOARD) { // Keyboard
		var message = readSelectorValue(obj, SelectorCache.message);
		var eventType = SCI_EVENT_DIRECTION;
		// Check if the game is using cursor views. These games allowed control
		// of the mouse cursor via the keyboard controls (the so called
		// "PseudoMouse" functionality in script 933).
		/*if (g_sci->_features->detectSetCursorType() == SCI_VERSION_1_1)
			eventType |= SCI_EVENT_KEYBOARD;
*/
        for(var x in keyToDirMap) {
            if(keyToDirMap[x].key == message) {
                writeSelectorValue(obj, SelectorCache.type, eventType);
                writeSelectorValue(obj, SelectorCache.message, keyToDirMap[x].dir);
                return new Reg(0, 1);	// direction mapped
            }
        }
		return new Reg(0, 0);	// unknown direction
	}

	return VM.state.acc;	// no keyboard event to map, leave accumulator unchanged
}

function kJoystick(args) {
    return new Reg(0, 0);
}
function kDoSound() {
    return new Reg(0, 0);
}

function kDoSoundInit() {
    Debug.log("Init sound!");
    return VM.state.acc;
}

kDoSound.prototype = {
    subFunctions : {
        0 : kDoSoundInit,
        1 : createStubFunction("SoundStub1"),
        2 : createStubFunction("SoundStub2"),
        3 : createStubFunction("SoundStub3"),
        4 : createStubFunction("SoundStub4"),
        5 : createStubFunction("SoundStub5"),
        6 : createStubFunction("SoundStub6"),
        7 : createStubFunction("SoundStub7"),
        8 : createStubFunction("SoundStub8"),
        9 : createStubFunction("SoundStub9"),
        10 : createStubFunction("SoundStub10"),
        11 : createStubFunction("SoundStub11"),
        12 : createStubFunction("SoundStub12"),
        13 : createStubFunction("SoundStub13"),
        14 : createStubFunction("SoundStub14"),
        15 : createStubFunction("SoundStub15"),
    }
};
var fileHandles = {};
var handleSeekPosition = {};
var nextFileHandle = 1;

function kFOpen(args) {
    var filename = SegManager.derefString(args[0]);
    var mode = args[1].toUint16();
    
    filename = ResourceManager.resourcePath + filename;
    Debug.log("FOpen() " + filename + " mode " + mode);

    if(!FileLoader.isLoaded(filename)) {
        FileLoader.loadText(filename, function() {});
        throw VM_LOAD_STALL;
    }
    else {
        fileHandles[nextFileHandle] = filename;
        handleSeekPosition[nextFileHandle] = 0;
        return new Reg(0, nextFileHandle++);
    }
}

function kFGets(args) {
	var maxsize = args[1].toUint16();
	var handle = args[2].toUint16();

    var data = FileLoader.getFile(fileHandles[handle]);

    SegManager.memcpy(args[0], data, maxsize);
	var readBytes = data.length;
	if(readBytes > maxsize)
	    readBytes = maxsize;
	    
	Debug.log(SegManager.derefString(args[0]));

	return readBytes != 0 ? args[0] : new Reg(0, 0);
}


function kFClose(args) {
    return VM.state.acc;
}

function kGetSaveDir(args) {
    return SegManager.getSaveDirPtr().clone();
}

function kGetCWD(args) {
	SegManager.strcpy(args[0], "/");

	return args[0];
}


function kScriptID(args) {
	var scriptNum = args[0].toUint16();
	var index = (args.length > 1) ? args[1].toUint16() : 0;

	if (args[0].segment != 0)
		return args[0].clone();

	var scriptSeg = SegManager.getScriptSegment(scriptNum);
	
	if(typeof scriptSeg == 'undefined') {
	    ResourceManager.loadScript(scriptNum);
	    throw VM_LOAD_STALL;
	}

	if (scriptSeg == 0)
		return new Reg(0, 0);

	var scr = SegManager.getScriptFromSegment(scriptSeg);

	if (scr.numExports == 0) {
		// This is normal. Some scripts don't have a dispatch (exports) table,
		// and this call is probably used to load them in memory, ignoring
		// the return value. If only one argument is passed, this call is done
		// only to load the script in memory. Thus, don't show any warning,
		// as no return value is expected. If an export is requested, then
		// it will most certainly fail with OOB access.
		if (args.length == 2)
			Debug.error("Script " + scriptNum + " does not have a dispatch table and export " + index + " was requested from it");
		return new Reg(0, 0);
	}

	if (index > scr.numExports) {
		Debug.error("Dispatch index too big: " + index + " > " + scr.numExports);
		return new Reg(0, 0);
	}

	var address = scr.validateExportFunc(index, true);

	// Point to the heap for SCI1.1 - SCI2.1 games
	if (getSciVersion() >= SciVersion.SCI_VERSION_1_1 && getSciVersion() <= SciVersion.SCI_VERSION_2_1)
		address += scr.getScriptSize();

	// Bugfix for the intro speed in PQ2 version 1.002.011.
	// This is taken from the patch by NewRisingSun(NRS) / Belzorash. Global 3
	// is used for timing during the intro, and in the problematic version it's
	// initialized to 0, whereas it's 6 in other versions. Thus, we assign it
	// to 6 here, fixing the speed of the introduction. Refer to bug #3102071.
	/*if (g_sci->getGameId() == GID_PQ2 && script == 200 &&
		s->variables[VAR_GLOBAL][3].isNull()) {
		s->variables[VAR_GLOBAL][3] = make_reg(0, 6);
	}*/

	return new Reg(scriptSeg, address);
}

function kIsObject(args) {
	if (args[0].offset == 0xFFFF) // Treated specially
		return new Reg(0, 0);
	else
		return new Reg(0, SegManager.isHeapObject(args[0]) ? 1 : 0);
}

function kClone(args) {
	var parentAddr = args[0];
	var parentObj = SegManager.getObject(parentAddr);
	var cloneAddr = new Reg(0, 0);
	var cloneObj;

	if (parentObj == null) {
		Debug.error("Attempt to clone non-object/class at " + parentAddr.toString() + "failed");
		return new Reg(0, 0);
	}

	Debug.log("KScripts", "Attempting to clone from " + parentAddr.toString());

	var infoSelector = parentObj.getInfoSelector().offset;
	cloneObj = SegManager.allocClone(cloneAddr);

	if (cloneObj == null) {
		Debug.error("Cloning " + parentAddr.toString() + "failed-- internal error");
		return new Reg(0, 0);
	}

	// In case the parent object is a clone itself we need to refresh our
	// pointer to it here. This is because calling allocateClone might
	// invalidate all pointers, references and iterators to data in the clones
	// segment.
	//
	// The reason why it might invalidate those is, that the segment code
	// (Table) uses Common::Array for internal storage. Common::Array now
	// might invalidate references to its contained data, when it has to
	// extend the internal storage size.
	if ((infoSelector & infoSelectorFlags.kInfoFlagClone) != 0)
		parentObj = SegManager.getObject(parentAddr);

    cloneObj.copyFrom(parentObj);

	// Mark as clone
	infoSelector &= ~infoSelectorFlags.kInfoFlagClass; // remove class bit
	cloneObj.setInfoSelector(new Reg(0, infoSelector | infoSelectorFlags.kInfoFlagClone));

	cloneObj.setSpeciesSelector(cloneObj.pos);
	if (parentObj.isClass())
		cloneObj.setSuperClassSelector(parentObj.pos);
		
//	s->_segMan->getScript(parentObj->getPos().segment)->incrementLockers();
	//s->_segMan->getScript(cloneObj->getPos().segment)->incrementLockers();

	return cloneAddr;
}

function kLoad(args) {
	var restype = args[0].toUint16() & 0x7f;
	var resnr = args[1].toUint16();

	// Request to dynamically allocate hunk memory for later use
	switch (restype) {
		case ResourceType.View:
		    if(ResourceManager.loadView(resnr) == null) {
		        throw VM_LOAD_STALL;
		    }
		break;
		case ResourceType.Cursor:
		    if(ResourceManager.loadCursor(resnr) == null) {
		        throw VM_LOAD_STALL;
		    }
		break;
		case ResourceType.Font:
		    if(ResourceManager.loadFont(resnr) == null) {
		        throw VM_LOAD_STALL;
		    }
		break;
		case ResourceType.Pic:
		    if(ResourceManager.loadPic(resnr) == null) {
		        throw VM_LOAD_STALL;
		    }
		break;
		case ResourceType.Script:
		    if(ResourceManager.loadScript(resnr) == null) {
		        throw VM_LOAD_STALL;
		    }
		break;
		case ResourceType.Text:
		    if(ResourceManager.loadText(resnr) == null) {
		        throw VM_LOAD_STALL;
		    }
		break;
	    case ResourceType.Memory:
		return SegManager.allocHunkEntry("kLoad()", resnr);
		
		default:
		    Debug.warn("Loading " + enumToString(ResourceType, restype) + "[" + restype + "] " + resnr);
		break;
    }

	return new Reg(0, ((restype << 11) | resnr)); // Return the resource identifier as handle

}

function kNewList(args) {
    var listAddr = new Reg(0, 0);
    var newList = SegManager.allocList(listAddr);
    Debug.log("KLists", "Created a list at address " + listAddr.toString());
    return listAddr;
}

function kFindKey(args) {
	var node_pos;
	var key = args[1];
	var list_pos = args[0];

    Debug.log("KLists", "Looking for key " + key.toString() + " in " + list_pos.toString());

	node_pos = SegManager.lookupList(list_pos).first;

	Debug.log("KLists", "First node at " + node_pos.toString());

	while (!node_pos.isNull()) {
		var n = SegManager.lookupNode(node_pos);
		if (n.key.equals(key)) {
			Debug.log("KLists", "Found key at " + node_pos.toString());
			return node_pos;
		}

		node_pos = n.succ;
		Debug.log("KLists", "NextNode at " + node_pos.toString());
	}

	Debug.log("KLists", "Looking for key without success");
	return new Reg(0, 0);
}

function kNewNode(args) {
	var nodeValue = args[0];
	// Some SCI32 games call this with 1 parameter (e.g. the demo of Phantasmagoria).
	// Set the key to be the same as the value in this case
	var nodeKey = (args.length == 2) ? args[1] : args[0];
	VM.state.acc = SegManager.newNode(nodeValue, nodeKey);

	Debug.log("KLists", "New nodeRef at " + VM.state.acc.toString() + " with node " + nodeKey);

	return VM.state.acc;
}

function addToFront(listRef, nodeRef) {
	var list = SegManager.lookupList(listRef);
	var newNode = SegManager.lookupNode(nodeRef);

	Debug.log("KLists", "Adding node " + nodeRef.toString() + " to end of list " + listRef.toString());

	if (newNode == null)
		Debug.error("Attempt to add non-node " + nodeRef.toString() + " to list at " + listRef.toString());

	newNode.pred = new Reg(0, 0);
	newNode.succ = list.first.clone();

	// Set node to be the first and last node if it's the only node of the list
	if (list.first.isNull())
		list.last = nodeRef.clone();
	else {
		var oldNode = SegManager.lookupNode(list.first);
		oldNode.pred = nodeRef.clone();
	}
	list.first = nodeRef.clone();
}

function addToEnd(listRef, nodeRef) {
	var list = SegManager.lookupList(listRef);
	var newNode = SegManager.lookupNode(nodeRef);

	Debug.log("KLists", "Adding node " + nodeRef.toString() + " to end of list " + listRef.toString());

	if (newNode == null)
		Debug.error("Attempt to add non-node " + nodeRef.toString() + " to list at " + listRef.toString());

	newNode.pred = list.last.clone();
	newNode.succ = new Reg(0, 0);

	// Set node to be the first and last node if it's the only node of the list
	if (list.last.isNull())
		list.first = nodeRef.clone();
	else {
		var old_n = SegManager.lookupNode(list.last);
		old_n.succ = nodeRef.clone();
	}
	list.last = nodeRef.clone();
}

function kAddToEnd(args) {
	addToEnd(args[0], args[1]);

	if (args.length == 3)
		SegManager.lookupNode(args[1]).key = args[2];

	return VM.state.acc;
}

function kAddToFront(args) {
	addToFront(args[0], args[1]);

	if (args.length == 3)
		SegManager.lookupNode(args[1]).key = args[2].clone();

	return VM.state.acc;
}

function kFirstNode(args) {
    if(args[0].isNull())
        return new Reg(0, 0);
        
    var list = SegManager.lookupList(args[0]);
    
    if(list != null) {
        return list.first.clone();
    }
    
    return new Reg(0, 0);
}

function kNextNode(args) {
    var n = SegManager.lookupNode(args[0]);
    return n.succ.clone();
}

function kNodeValue(args) {
    var n = SegManager.lookupNode(args[0]);

    if(n != null) {
        return n.value.clone();
    }
    else {
        return new Reg(0, 0);
    }
}

function kDeleteKey(args) {
	var node_pos = kFindKey(args);
	var n;
	var list = SegManager.lookupList(args[0]);

	if (node_pos.isNull())
		return new Reg(0, 0); // Signal failure

	n = SegManager.lookupNode(node_pos);
	if (list.first.equals(node_pos))
		list.first = n.succ.clone();
	if (list.last.equals(node_pos))
		list.last = n.pred.clone();

	if (!n.pred.isNull())
		SegManager.lookupNode(n.pred).succ = n.succ.clone();
	if (!n.succ.isNull())
		SegManager.lookupNode(n.succ).pred = n.pred.clone();

	// Erase references to the predecessor and successor nodes, as the game
	// scripts could reference the node itself again.
	// Happens in the intro of QFG1 and in Longbow, when exiting the cave.
	n.pred = new Reg(0, 0);
	n.succ = new Reg(0, 0);

	return new Reg(0, 1); // Signal success
}


function kDisposeList(args) {
    // Not need apparently
    return VM.state.acc;
}

function kGameIsRestarting(args) {
    // TODO: when actually restarting
    return new Reg(0, 0);
}

function kFlushResources(args) {
    Debug.log("Entering room number " + args[0].toUint16());
    
    return VM.state.acc;
}

function kHaveMouse(args) {
    return new Reg(0, 0xFFFF);
}

var kMemoryInfoFunc = {
	K_MEMORYINFO_LARGEST_HEAP_BLOCK : 0, // Largest heap block available
	K_MEMORYINFO_FREE_HEAP : 1, // Total free heap memory
	K_MEMORYINFO_LARGEST_HUNK_BLOCK : 2, // Largest available hunk memory block
	K_MEMORYINFO_FREE_HUNK : 3, // Amount of free DOS paragraphs
	K_MEMORYINFO_TOTAL_HUNK : 4 // Total amount of hunk memory (SCI01)
};

function kMemoryInfo(args) {
	// The free heap size returned must not be 0xffff, or some memory
	// calculations will overflow. Crazy Nick's games handle up to 32746
	// bytes (0x7fea), otherwise they throw a warning that the memory is
	// fragmented
	var size = 0x7fea;

	switch (args[0].offset) {
	case kMemoryInfoFunc.K_MEMORYINFO_LARGEST_HEAP_BLOCK:
		// In order to prevent "Memory fragmented" dialogs from
		// popping up in some games, we must return FREE_HEAP - 2 here.
		return new Reg(0, size - 2);
	case kMemoryInfoFunc.K_MEMORYINFO_FREE_HEAP:
	case kMemoryInfoFunc.K_MEMORYINFO_LARGEST_HUNK_BLOCK:
	case kMemoryInfoFunc.K_MEMORYINFO_FREE_HUNK:
	case kMemoryInfoFunc.K_MEMORYINFO_TOTAL_HUNK:
		return new Reg(0, size);

	default:
		Debug.error("Unknown MemoryInfo operation: " +  args[0].offset);
	}

	return new Reg(0, 0);
}

var kTimeType = {
	KGETTIME_TICKS : 0,
	KGETTIME_TIME_12HOUR : 1,
	KGETTIME_TIME_24HOUR : 2,
	KGETTIME_DATE : 3
};

// TODO
function kGetTime(args) {
	var locTime = new Date();
	var retval = 0; // Avoid spurious warning

//    Debug.warn("kGetTime");

	var mode = (args.length > 0) ? args[0].toUint16() : 0;

	// Modes 2 and 3 are supported since 0.629.
	// This condition doesn't check that exactly, but close enough.
	if (getSciVersion() == SciVersion.SCI_VERSION_0_EARLY && mode > 1)
		Debug.error("kGetTime called in SCI0 with mode " + mode + "(expected 0 or 1)");

	switch (mode) {
	case kTimeType.KGETTIME_TICKS :
		retval = Engine.getTicks();
		break;
	case kTimeType.KGETTIME_TIME_12HOUR :
		retval = ((locTime.getHours() % 12) << 12) | (locTime.getMinutes() << 6) | (locTime.getSeconds());
	//	debugC(kDebugLevelTime, "GetTime(12h) returns %d", retval);
		break;
	/*case kTimeType.KGETTIME_TIME_24HOUR :
		retval = (loc_time.tm_hour << 11) | (loc_time.tm_min << 5) | (loc_time.tm_sec >> 1);
		debugC(kDebugLevelTime, "GetTime(24h) returns %d", retval);
		break;
	case kTimeType.KGETTIME_DATE :
		retval = loc_time.tm_mday | ((loc_time.tm_mon + 1) << 5) | (((loc_time.tm_year + 1900) & 0x7f) << 9);
		debugC(kDebugLevelTime, "GetTime(date) returns %d", retval);
		break;*/
	default:
		Debug.error("Attempt to use unknown GetTime mode " + mode);
		break;
	}

	return new Reg(0, retval);
}

function kWait(args) {
	var sleepTime = args[0].toUint16();

	VM.state.wait(sleepTime);
	
	Debug.log("KMisc", "kWait " + sleepTime);

	return VM.state.acc;
}

var opcode = {
    op_bnot     : 0x00,	// 000
    op_add      : 0x01,	// 001
    op_sub      : 0x02,	// 002
    op_mul      : 0x03,	// 003
    op_div      : 0x04,	// 004
    op_mod      : 0x05,	// 005
    op_shr      : 0x06,	// 006
    op_shl      : 0x07,	// 007
    op_xor      : 0x08,	// 008
    op_and      : 0x09,	// 009
    op_or       : 0x0a,	// 010
    op_neg      : 0x0b,	// 011
    op_not      : 0x0c,	// 012
    op_eq_      : 0x0d,	// 013
    op_ne_      : 0x0e,	// 014
    op_gt_      : 0x0f,	// 015
    op_ge_      : 0x10,	// 016
    op_lt_      : 0x11,	// 017
    op_le_      : 0x12,	// 018
    op_ugt_     : 0x13,	// 019
    op_uge_     : 0x14,	// 020
    op_ult_     : 0x15,	// 021
    op_ule_     : 0x16,	// 022
    op_bt       : 0x17,	// 023
    op_bnt      : 0x18,	// 024
    op_jmp      : 0x19,	// 025
    op_ldi      : 0x1a,	// 026
    op_push     : 0x1b,	// 027
    op_pushi    : 0x1c,	// 028
    op_toss     : 0x1d,	// 029
    op_dup      : 0x1e,	// 030
    op_link     : 0x1f,	// 031
    op_call     : 0x20,	// 032
    op_callk    : 0x21,	// 033
    op_callb    : 0x22,	// 034
    op_calle    : 0x23,	// 035
    op_ret      : 0x24,	// 036
    op_send     : 0x25,	// 037
    // dummy      0x26,	// 038
    // dummy      0x27,	// 039
    op_class    : 0x28,	// 040
    // dummy      0x29,	// 041
    op_self     : 0x2a,	// 042
    op_super    : 0x2b,	// 043
    op_rest     : 0x2c,	// 044
    op_lea      : 0x2d,	// 045
    op_selfID   : 0x2e,	// 046
    // dummy      0x2f	// 047
    op_pprev    : 0x30,	// 048
    op_pToa     : 0x31,	// 049
    op_aTop     : 0x32,	// 050
    op_pTos     : 0x33,	// 051
    op_sTop     : 0x34,	// 052
    op_ipToa    : 0x35,	// 053
    op_dpToa    : 0x36,	// 054
    op_ipTos    : 0x37,	// 055
    op_dpTos    : 0x38,	// 056
    op_lofsa    : 0x39,	// 057
    op_lofss    : 0x3a,	// 058
    op_push0    : 0x3b,	// 059
    op_push1    : 0x3c,	// 060
    op_push2    : 0x3d,	// 061
    op_pushSelf : 0x3e,	// 062
    op_line     : 0x3f,	// 063
    op_lag      : 0x40,	// 064
    op_lal      : 0x41,	// 065
    op_lat      : 0x42,	// 066
    op_lap      : 0x43,	// 067
    op_lsg      : 0x44,	// 068
    op_lsl      : 0x45,	// 069
    op_lst      : 0x46,	// 070
    op_lsp      : 0x47,	// 071
    op_lagi     : 0x48,	// 072
    op_lali     : 0x49,	// 073
    op_lati     : 0x4a,	// 074
    op_lapi     : 0x4b,	// 075
    op_lsgi     : 0x4c,	// 076
    op_lsli     : 0x4d,	// 077
    op_lsti     : 0x4e,	// 078
    op_lspi     : 0x4f,	// 079
    op_sag      : 0x50,	// 080
    op_sal      : 0x51,	// 081
    op_sat      : 0x52,	// 082
    op_sap      : 0x53,	// 083
    op_ssg      : 0x54,	// 084
    op_ssl      : 0x55,	// 085
    op_sst      : 0x56,	// 086
    op_ssp      : 0x57,	// 087
    op_sagi     : 0x58,	// 088
    op_sali     : 0x59,	// 089
    op_sati     : 0x5a,	// 090
    op_sapi     : 0x5b,	// 091
    op_ssgi     : 0x5c,	// 092
    op_ssli     : 0x5d,	// 093
    op_ssti     : 0x5e,	// 094
    op_sspi     : 0x5f,	// 095
    op_plusag   : 0x60,	// 096
    op_plusal   : 0x61,	// 097
    op_plusat   : 0x62,	// 098
    op_plusap   : 0x63,	// 099
    op_plussg   : 0x64,	// 100
    op_plussl   : 0x65,	// 101
    op_plusst   : 0x66,	// 102
    op_plussp   : 0x67,	// 103
    op_plusagi  : 0x68,	// 104
    op_plusali  : 0x69,	// 105
    op_plusati  : 0x6a,	// 106
    op_plusapi  : 0x6b,	// 107
    op_plussgi  : 0x6c,	// 108
    op_plussli  : 0x6d,	// 109
    op_plussti  : 0x6e,	// 110
    op_plusspi  : 0x6f,	// 111
    op_minusag  : 0x70,	// 112
    op_minusal  : 0x71,	// 113
    op_minusat  : 0x72,	// 114
    op_minusap  : 0x73,	// 115
    op_minussg  : 0x74,	// 116
    op_minussl  : 0x75,	// 117
    op_minusst  : 0x76,	// 118
    op_minussp  : 0x77,	// 119
    op_minusagi : 0x78,	// 120
    op_minusali : 0x79,	// 121
    op_minusati : 0x7a,	// 122
    op_minusapi : 0x7b,	// 123
    op_minussgi : 0x7c,	// 124
    op_minussli : 0x7d,	// 125
    op_minussti : 0x7e,	// 126
    op_minusspi : 0x7f	// 127
};

// Opcode formats
var OpcodeParam = {
	Invalid : -1,
	None : 0,
	Byte : 1,
	SByte : 2,
	Word : 3,
	SWord : 4,
	Variable : 5,
	SVariable : 6,
	SRelative : 7,
	Property : 8,
	Global : 9,
	Local : 10,
	Temp : 11,
	Param : 12,
	Offset : 13,
	End : 14
};

var opcodeFormats = [
	/*00*/
	[OpcodeParam.None], [OpcodeParam.None], [OpcodeParam.None], [OpcodeParam.None],
	/*04*/
	[OpcodeParam.None], [OpcodeParam.None], [OpcodeParam.None], [OpcodeParam.None],
	/*08*/
	[OpcodeParam.None], [OpcodeParam.None], [OpcodeParam.None], [OpcodeParam.None],
	/*0C*/
	[OpcodeParam.None], [OpcodeParam.None], [OpcodeParam.None], [OpcodeParam.None],
	/*10*/
	[OpcodeParam.None], [OpcodeParam.None], [OpcodeParam.None], [OpcodeParam.None],
	/*14*/
	[OpcodeParam.None], [OpcodeParam.None], [OpcodeParam.None], [OpcodeParam.SRelative],
	/*18*/
	[OpcodeParam.SRelative], [OpcodeParam.SRelative], [OpcodeParam.SVariable], [OpcodeParam.None],
	/*1C*/
	[OpcodeParam.SVariable], [OpcodeParam.None], [OpcodeParam.None], [OpcodeParam.Variable],
	/*20*/
	[OpcodeParam.SRelative, OpcodeParam.Byte], [OpcodeParam.Variable, OpcodeParam.Byte], [OpcodeParam.Variable, OpcodeParam.Byte], [OpcodeParam.Variable, OpcodeParam.SVariable, OpcodeParam.Byte],
	/*24 (24=ret)*/
	[OpcodeParam.End], [OpcodeParam.Byte], [OpcodeParam.Invalid], [OpcodeParam.Invalid],
	/*28*/
	[OpcodeParam.Variable], [OpcodeParam.Invalid], [OpcodeParam.Byte], [OpcodeParam.Variable, OpcodeParam.Byte],
	/*2C*/
	[OpcodeParam.SVariable], [OpcodeParam.SVariable, OpcodeParam.Variable], [OpcodeParam.None], [OpcodeParam.Invalid],
	/*30*/
	[OpcodeParam.None], [OpcodeParam.Property], [OpcodeParam.Property], [OpcodeParam.Property],
	/*34*/
	[OpcodeParam.Property], [OpcodeParam.Property], [OpcodeParam.Property], [OpcodeParam.Property],
	/*38*/
	[OpcodeParam.Property], [OpcodeParam.SRelative], [OpcodeParam.SRelative], [OpcodeParam.None],
	/*3C*/
	[OpcodeParam.None], [OpcodeParam.None], [OpcodeParam.None], [OpcodeParam.Word],
	/*40-4F*/
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param],
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param],
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param],
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param],
	/*50-5F*/
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param],
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param],
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param],
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param],
	/*60-6F*/
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param],
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param],
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param],
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param],
	/*70-7F*/
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param],
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param],
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param],
	[OpcodeParam.Global], [OpcodeParam.Local], [OpcodeParam.Temp], [OpcodeParam.Param]
];

// TODO: put this somewhere sensible:
function adjustOpcodeFormats() {
//	if (g_sci->_features->detectLofsType() != SCI_VERSION_0_EARLY) {
		opcodeFormats[opcode.op_lofsa][0] = OpcodeParam.Offset;
		opcodeFormats[opcode.op_lofss][0] = OpcodeParam.Offset;
//	}
/*
#ifdef ENABLE_SCI32
	// In SCI32, some arguments are now words instead of bytes
	if (getSciVersion() >= SCI_VERSION_2) {
		g_sci->_opcode_formats[op_calle][2] = Script_Word;
		g_sci->_opcode_formats[op_callk][1] = Script_Word;
		g_sci->_opcode_formats[op_super][1] = Script_Word;
		g_sci->_opcode_formats[op_send][0] = Script_Word;
		g_sci->_opcode_formats[op_self][0] = Script_Word;
		g_sci->_opcode_formats[op_call][1] = Script_Word;
		g_sci->_opcode_formats[op_callb][1] = Script_Word;
	}

	if (getSciVersion() >= SCI_VERSION_3) {
		// TODO: There are also opcodes in
		// here to get the superclass, and possibly the species too.
		g_sci->_opcode_formats[0x4d/2][0] = Script_None;
		g_sci->_opcode_formats[0x4e/2][0] = Script_None;
	}
#endif*/
}

adjustOpcodeFormats();

function readVMInstruction(data, start) {
    var output = {
        offset : 0,
        opcode : 0,
        extendedOpcode : 0,
        params : []
    };
    
    var ptr = start;
    
    output.extendedOpcode = data.getByte(ptr++);
    output.opcode = output.extendedOpcode >> 1;
    
    for (var i = 0; opcodeFormats[output.opcode][i] != OpcodeParam.None && i < opcodeFormats[output.opcode].length; ++i) {
		//debugN("Opcode: 0x%x, Opnumber: 0x%x, temp: %d\n", opcode, opcode, temp);
		
		switch (opcodeFormats[output.opcode][i]) {

		case OpcodeParam.Byte:
			output.params[i] = data.getByte(ptr++);
			break;
		case OpcodeParam.SByte:
			output.params[i] = data.getSignedByte(ptr++);
			break;
		case OpcodeParam.Word:
			output.params[i] = data.getUint16LE(ptr);
			ptr += 2;
			break;
		case OpcodeParam.SWord:
			output.params[i] = data.getSint16LE(ptr);
			ptr += 2;
			break;

		case OpcodeParam.Variable:
		case OpcodeParam.Property:

		case OpcodeParam.Local:
		case OpcodeParam.Temp:
		case OpcodeParam.Global:
		case OpcodeParam.Param:

		case OpcodeParam.Offset:
			if ((output.extendedOpcode & 0x1) != 0) {
				output.params[i] = data.getByte(ptr++);
			} else {
				output.params[i] = data.getUint16LE(ptr);
				ptr += 2;
			}
			break;

		case OpcodeParam.SVariable:
		case OpcodeParam.SRelative:
			if ((output.extendedOpcode & 0x1) != 0) {
				output.params[i] = data.getSignedByte(ptr++);
			} else {
				output.params[i] = data.getSint16LE(ptr);
				ptr += 2;
			}
			break;

		case OpcodeParam.None:
		case OpcodeParam.End:
			break;

		case OpcodeParam.Invalid:
		default:
			Debug.error("opcode " + output.extendedOpcode + " (" + enumToString(opcodes, output.opcode) + ") param: " + i + " Invalid");
		}
	}
    
    output.offset = ptr - start;
    
    return output;
}

// VM Types 

var VariableTypes = {
	VAR_GLOBAL : 0,
	VAR_LOCAL : 1,
	VAR_TEMP : 2,
	VAR_PARAM : 3
};

function StringPtr(str) {
    this.str = str;
    this.isRaw = true;
}

StringPtr.prototype = {
    getChar : function(x) {
        return this.str.charCodeAt(x);
    },
    
    setChar : function(x, y) {
        this.str = this.str.substr(0, x) + String.fromCharCode(y) + str.substr(x+1);
    }
};

function ArrayPtr(array, index) {
    this.array = array;
    this.index = index;
}

ArrayPtr.prototype = {
    getValue : function(x) {
        if(typeof x == 'undefined')
            return this.array[this.index];
        else
            return this.array[this.index + x];
    },
    
    setValue : function(x, y) {
        if(typeof y == 'undefined')
            this.array[this.index] = x;
        else
            this.array[this.index + x] = y;
    }
};

function ObjVarRef() {
    this.obj = new Reg(0, 0);
    this.varIndex = 0;
}

ObjVarRef.prototype = {
    getPointer : function() {
        var o = SegManager.getObject(this.obj);
        if(o != null) {
            return o.getVariableRef(this.varIndex);
        }
        return null;
    },
    
    clone : function() {
        var cloned = new ObjVarRef();
        cloned.obj = this.obj.clone();
        cloned.varIndex = this.varIndex;
        return cloned;
    }
};

var Reg = function(segment, offset) {
    this.segment = segment ;
    this.offset = offset & 0xFFFF;
}

var NULL_REG = new Reg(0, 0);
var SIGNAL_REG = new Reg(0, 0xffff);
var TRUE_REG = new Reg(0, 1);

function lookForWorkaround(reg) {
    Debug.error("Not implemented (workaround)");
}

var SIGN_EXTENSION_8_MASK = 1 << 7;
var SIGN_EXTENSION_16_MASK = 1 << 15;

Reg.prototype = {
    toString : function() {
        return this.segment.toString() + ":0x" + this.offset.toString(16);
    },

    clone : function() {
        return new Reg(this.segment, this.offset);
    },
    
    set : function(other) {
        this.segment = other.segment;
        this.offset = other.offset;
    },

    isNull : function() {
        return (this.offset | this.segment) == 0;
    },
    
    toUint16 : function() {
        return this.offset & 0xFFFF;
    },

    toSint16 : function() {
/*        if((this.offset & 0x8000) != 0) {
           return -1 * ( (~(this.offset - 1)) & 0xFFFF);
        }
        return this.offset;*/
        return (this.offset ^ SIGN_EXTENSION_16_MASK) - SIGN_EXTENSION_16_MASK;
    },

	isNumber : function() {
		return this.segment == 0;
	},

	isPointer : function() {
		return this.segment != 0 && this.segment != 0xFFFF;
	},    

    requireUint16 : function() {
        if(this.isNumber()) {
            return this.toUint16();
        }
        else {
            return lookForWorkaround(NULL_REG).toUint16();
        }
    },

    requireSint16 : function() {
        if(this.isNumber()) {
            return this.toSint16();
        }
        else {
            return lookForWorkaround(NULL_REG).toSint16();
        }
    },
    
    
	isInitialized : function() {
		return this.segment != 0xFFFF;
	},
	
    // comparison
	equals : function(x) {
		return (this.offset == x.offset) && (this.segment == x.segment);
	},

	notEqual : function(x) {
		return (this.offset != x.offset) || (this.segment != x.segment);
	},

	greaterThan : function(right)  {
		return this.cmp(right, false) > 0;
	},

	greaterEqual : function (right) {
		return this.cmp(right, false) >= 0;
	},

	lessThan : function (right) {
		return this.cmp(right, false) < 0;
	},

	lessEqual : function(right) {
		return this.cmp(right, false) <= 0;
	},
	
	// Unsigned comparison
	greaterThanU : function(right)  {
		return this.cmp(right, true) > 0;
	},

	greaterEqualU : function (right) {
		return this.cmp(right, true) >= 0;
	},

	lessThanU : function (right) {
		return this.cmp(right, true) < 0;
	},

	lessEqualU : function(right) {
		return this.cmp(right, true) <= 0;
	},

    cmp : function(right, treatAsUnsigned) {
        if (this.segment == right.segment) { // can compare things in the same segment
            if (treatAsUnsigned || !this.isNumber())
                return this.toUint16() - right.toUint16();
            else
                return this.toSint16() - right.toSint16();
        } 
        else if (this.pointerComparisonWithInteger(right)) {
            return 1;
        } 
        else if (right.pointerComparisonWithInteger(this)) {
            return -1;
        } 
        else {
		    return lookForWorkaround(right).toSint16();    
		}
    },
    
    pointerComparisonWithInteger : function(right) {
    	return (this.isPointer() && right.isNumber() && right.offset <= 2000); // && getSciVersion() <= SCI_VERSION_1_1);
    },

    // Bitwise operators
    bitwiseAnd : function(right) {
        if(this.isNumber() && right.isNumber()) {
            return new Reg(0, this.toUint16() & right.toUint16());
        }
        else {
            return lookForWorkaround(right);
        }
    },
    
    bitwiseOr : function(right) {
        if(this.isNumber() && right.isNumber()) {
            return new Reg(0, this.toUint16() | right.toUint16());
        }
        else {
            return lookForWorkaround(right);
        }
    },

    bitwiseXor : function(right) {
        if(this.isNumber() && right.isNumber()) {
            return new Reg(0, this.toUint16() ^ right.toUint16());
        }
        else {
            return lookForWorkaround(right);
        }
    },
    
	// Arithmetic operators
	add : function(right) {
	    if(typeof(right) == "number") {
	        return this.add(new Reg(0, right));
	    }
	
	    if(this.isPointer() && right.isNumber()) {
            // Pointer arithmetics. Only some pointer types make sense here
            var mobj = SegManager.getSegmentObj(this.segment);
    
            if (mobj == null)
                Debug.error("[VM]: Attempt to add to invalid pointer " + this.toString());
    
            switch (mobj.segmentType) {
            case SegmentType.SEG_TYPE_LOCALS:
            case SegmentType.SEG_TYPE_SCRIPT:
            case SegmentType.SEG_TYPE_STACK:
            case SegmentType.SEG_TYPE_DYNMEM:
                return new Reg(this.segment, this.offset + right.toSint16());
            default:
                return lookForWorkaround(right);
            }
	    }
	    else if(this.isNumber() && right.isPointer()) {
	        return right.add(this);
	    }
	    if(this.isNumber() && right.isNumber()) {
	        return new Reg(0, this.toSint16() + right.toSint16());
	    }
	    else {
	        lookForWorkaround(right);
	    }
	    
	    return this;
	},
	
	subtract : function(right) {
	    if(typeof(right) == "number") {
	        return this.subtract(new Reg(0, right));
	    }
	    
	    if(this.segment == right.segment) {
	        return new Reg(0, this.toSint16() - right.toSint16());
	    }
	    else {
	        return this.add(new Reg(right.segment, -right.offset));
	    }
	},
	
	increment : function(right) {
	    var result = this.add(right);
		this.segment = result.segment;
		this.offset = result.offset;
	},
	
	decrement : function(right) {
	    var result = this.subtract(right);
		this.segment = result.segment;
		this.offset = result.offset;
	},
	
	multiply : function(right) {
	    if(this.isNumber() && right.isNumber()) {
	        return new Reg(0, this.toSint16() * right.toSint16());
	    }
	    else {
	        lookForWorkaround(right);
	    }
	},
	
	divide : function(right) {
	    if(this.isNumber() && right.isNumber()) {
	        return new Reg(0, parseInt(this.toSint16() / right.toSint16()));
	    }
	    else {
	        lookForWorkaround(right);
	    }
	},
	
	modulo : function(right) {
        if(this.isNumber() && right.isNumber() && !right.isNull()) {
            // Support for negative numbers was added in Iceman, and perhaps in
            // SCI0 0.000.685 and later. Theoretically, this wasn't really used
            // in SCI0, so the result is probably unpredictable. Such a case
            // would indicate either a script bug, or a modulo on an unsigned
            // integer larger than 32767. In any case, such a case should be
            // investigated, instead of being silently accepted.
            //if (getSciVersion() <= SCI_VERSION_0_LATE && (toSint16() < 0 || right.toSint16() < 0))
              //  warning("Modulo of a negative number has been requested for SCI0. This *could* lead to issues");
            var value = this.toSint16();
            var modulo = Math.abs(right.toSint16());
            var result = value % modulo;
            if (result < 0)
                result += modulo;
            return new Reg(0, result);
        } 
        else {
            return lookForWorkaround(right);	    
        }
	},
	
	shiftRight : function(right) {
        if(this.isNumber() && right.isNumber())
            return new Reg(0, this.toUint16() >> right.toUint16());
        else
            return lookForWorkaround(right);
    },

	shiftLeft : function(right) {
        if(this.isNumber() && right.isNumber())
            return new Reg(0, this.toUint16() << right.toUint16());
        else
            return lookForWorkaround(right);
    }
    
}


var debugReg = null;
var maxCycles = 10000000;
var cyclesPerFrame = 5000;

var ExecStackType = {
	EXEC_STACK_TYPE_CALL : 0,
	EXEC_STACK_TYPE_KERNEL : 1,
	EXEC_STACK_TYPE_VARSELECTOR : 2
};

function ExecStack(objp, sendp, sp, argc, argp, localsSegment, pc, 
                    debugSelector, debugExportId, debugLocalCallOffset, debugOrigin, type) {
    this.objp = objp.clone();
    this.sendp = sendp.clone();
    this.pc = pc.clone();
    this.varp = new ObjVarRef();
    
    this.fp = sp;
    this.sp = sp;
    
    this.argc = argc;
    this.variablesArgp = argp;
    
    VM.state.stack[argp] = new Reg(0, argc);
    
    if (localsSegment != 0xFFFF)
        this.localSegment = localsSegment;
    else
        this.localSegment = pc.segment;
    
    this.debugSelector = debugSelector;
    this.debugExportId = debugExportId;
    this.debugLocalCallOffset = debugLocalCallOffset;
    this.debugOrigin = debugOrigin;
    this.type = type;
}

ExecStack.prototype = {
    getVarPointer : function() {
        if(this.type != ExecStackType.EXEC_STACK_TYPE_VARSELECTOR) {
            Debug.warn("This exec stack is not a var selector!");
        }
        return this.varp.getPointer();
    }
};

function VMState() {
    this.acc = new Reg(0, 0);
    this.prev = new Reg(0, 0);
    this.rest = 0;
    
    this.executionStackPosChanged = false;
    this.executionStackBase = 0;
    this.executionStack = [];
    this.xs;
    
    this.variables = [null, null, null, null];		///< global, local, temp, param, as immediate pointers
	this.variablesBase = [null, null, null, null];	///< Used for referencing VM ops
	this.variablesSegment = [0, 0, 0, 0];	///< Same as above, contains segment IDs
	this.variablesMax = [0, 0, 0, 0];		///< Max. values for all variables
    
    this.stack = [];
    this.stackBase = 0;
    this.stackTop = 0;
    
    this.waitTicks = 0;
    this.lastWaitTime = 0;
}

VMState.prototype = {
    wait : function(ticks) {
        var gameTicks = Engine.getTicks();
        this.acc = new Reg(0, gameTicks - this.lastWaitTime);
        this.lastWaitTime = gameTicks;
        this.waitTicks = ticks;
    }
};

var VM = (function() {
    var VM_STACK_SIZE = 0x1000;
    var NULL_SELECTOR = -1;
    
    var state = new VMState();
    var mainRunFunction = null;
    
    var reset = function() {
    };

    var push32 = function(x) {
        Debug.log("VM", "Pushing " + x.toString() + " at pc " + state.xs.pc.offset);
        state.stack[state.xs.sp] = x.clone();
        state.xs.sp ++;
        validateStackAddr(state.xs.sp);
        return x;
    }

    var push = function(x) {
        push32(new Reg(0, x));
    }
    
    var pop32 = function() {
        state.xs.sp --;
        validateStackAddr(state.xs.sp);
        //Debug.log("Popping " + state.stack[state.xs.sp].toString() + " at pc " + state.xs.pc.offset);
        return state.stack[state.xs.sp].clone();
    }
    
    var validateStackAddr = function(sp) {
        //VM.dumpStack();
/*        for(x in state.stack) {
            if(typeof state.stack[x].segment != 'number') {
                Debug.error("Oh noes!");
            }
        }*/
        
        if(sp >= state.stackBase && sp < state.stackTop) {
            return sp;
        }
        else {
            Debug.error("Invalid stack address!");
            return 0;
        }
    };
    
    var addKernelCallToExecStack = function(kernelCallNr, argc, argv) {
        // Add stack frame to indicate we're executing a callk.
        // This is useful in debugger backtraces if this
        // kernel function calls a script itself.
        var nullReg = new Reg(0, 0);
        
        var xstack = new ExecStack(nullReg, nullReg, null, argc, argv - 1, 0xFFFF, nullReg,
                            kernelCallNr, -1, -1, state.executionStack.length - 1, ExecStackType.EXEC_STACK_TYPE_KERNEL);
        state.executionStack.push(xstack);
    }


    var callKernelFunc = function(kernelCallNr, argc) {
        if (kernelCallNr >= Kernel.kernelFuncs.length)
            Debug.error("Invalid kernel function 0x" + kernelCallNr.toString(16) + " requested");
    
        var kernelCall = Kernel.kernelFuncs[kernelCallNr];
        
        var args = [];
        var argv = state.xs.sp + 1;
        
        for(var arg = 0; arg<argc; arg++) {
            args.push(state.stack[state.xs.sp + 1 + arg]);
        }
    
        // TODO: check signatures, workarounds
/*        if (kernelCall.signature
                && !kernel->signatureMatch(kernelCall.signature, argc, argv)) {
            // signature mismatch, check if a workaround is available
            SciTrackOriginReply originReply;
            SciWorkaroundSolution solution = trackOriginAndFindWorkaround(0, kernelCall.workarounds, &originReply);
            switch (solution.type) {
            case WORKAROUND_NONE:
                kernel->signatureDebug(kernelCall.signature, argc, argv);
                error("[VM] k%s[%x]: signature mismatch via method %s::%s (room %d, script %d, localCall 0x%x)",
                    kernelCall.name, kernelCallNr, originReply.objectName.c_str(), originReply.methodName.c_str(),
                    s->currentRoomNumber(), originReply.scriptNr, originReply.localCallOffset);
                break;
            case WORKAROUND_IGNORE: // don't do kernel call, leave acc alone
                return;
            case WORKAROUND_STILLCALL: // call kernel anyway
                break;
            case WORKAROUND_FAKE: // don't do kernel call, fake acc
                s->r_acc = make_reg(0, solution.value);
                return;
            default:
                error("unknown workaround type");
            }
        }*/
    
    
        // Call kernel function
        if (kernelCall.subFunctions.length == 0) {
            addKernelCallToExecStack(kernelCallNr, argc, argv);
            Debug.log("VMKF", "[VM] Calling kernel function " + Kernel.getKernelFuncName(kernelCallNr));
            try {
                var funcOutput = kernelCall.func(args);
            }
            catch(exception) {
                if(exception == VM_LOAD_STALL) {
                    if (state.executionStack.length > 1)
                        state.executionStack.pop();
                }
                throw exception;
            }
            state.acc = funcOutput;
            Debug.log("VMKF", "[VM] Result = " + state.acc.toString());
        } else {
            // Sub-functions available, check signature and call that one directly
            if (argc < 1)
                Debug.error("[VM] " + kernelCall.name + " no subfunction ID parameter given");
            if (args[0].isPointer())
                Debug.error("[VM] " + kernelCall.name + " : given subfunction ID is actually a pointer");
            var subId = args[0].toUint16();
            // Skip over subfunction-id
            argc--;
            args.shift();
            argv++;
            if (subId >= kernelCall.subFunctions.length)
                Debug.error("[VM] " + kernelCall.name + " : subfunction ID " + subId + " requested, but not available");
            var kernelSubCall = kernelCall.subFunctions[subId];
            /*
                TODO: workarounds and signature check
            if (kernelSubCall.signature && !kernel->signatureMatch(kernelSubCall.signature, argc, argv)) {
                // Signature mismatch
                SciTrackOriginReply originReply;
                SciWorkaroundSolution solution = trackOriginAndFindWorkaround(0, kernelSubCall.workarounds, &originReply);
                switch (solution.type) {
                case WORKAROUND_NONE: {
                    kernel->signatureDebug(kernelSubCall.signature, argc, argv);
                    int callNameLen = strlen(kernelCall.name);
                    if (strncmp(kernelCall.name, kernelSubCall.name, callNameLen) == 0) {
                        const char *subCallName = kernelSubCall.name + callNameLen;
                        error("[VM] k%s(%s): signature mismatch via method %s::%s (room %d, script %d, localCall %x)",
                            kernelCall.name, subCallName, originReply.objectName.c_str(), originReply.methodName.c_str(),
                            s->currentRoomNumber(), originReply.scriptNr, originReply.localCallOffset);
                    }
                    error("[VM] k%s: signature mismatch via method %s::%s (room %d, script %d, localCall %x)",
                        kernelSubCall.name, originReply.objectName.c_str(), originReply.methodName.c_str(),
                        s->currentRoomNumber(), originReply.scriptNr, originReply.localCallOffset);
                    break;
                }
                case WORKAROUND_IGNORE: // don't do kernel call, leave acc alone
                    return;
                case WORKAROUND_STILLCALL: // call kernel anyway
                    break;
                case WORKAROUND_FAKE: // don't do kernel call, fake acc
                    s->r_acc = make_reg(0, solution.value);
                    return;
                default:
                    error("unknown workaround type");
                }
            }*/
            if (kernelSubCall.func == null)
                Debug.error("[VM] " + kernelCall.name + " : subfunction ID " + subId + " requested, but not available");
            addKernelCallToExecStack(kernelCallNr, argc, argv);
            Debug.log("VMKF", "[VM] Calling kernel function " + Kernel.getKernelFuncName(kernelCallNr) + " sub function " + subId);
            try {
                var funcOutput = kernelSubCall.func(args);
            }
            catch(exception) {
                if(exception == VM_LOAD_STALL) {
                    if (state.executionStack.length > 1)
                        state.executionStack.pop();
                }
                throw exception;
            }
            state.acc = funcOutput;
            Debug.log("VMKF", "[VM] Result = " + state.acc.toString());

        }
    
        // Remove callk stack frame again, if there's still an execution stack
        if (state.executionStack.length > 1)
            state.executionStack.pop();
            
        return 0;
    }

    //ExecStack *execute_method(EngineState *s, uint16 script, uint16 pubfunct, StackPtr sp, reg_t calling_obj, uint16 argc, StackPtr argp) {
    
    var executeMethod = function(scriptNum, pubFunct, sp, callingObj, argc, argp) {
        
        if(!SegManager.isScriptLoaded(scriptNum)) {
            ResourceManager.loadScript(scriptNum, true);
            throw VM_LOAD_STALL;
        }
        
	    var seg = SegManager.getScriptSegment(scriptNum);
	    var scr = SegManager.getScriptFromSegment(seg);

        scr.init();

        // TODO
/*        if (!scr || scr->isMarkedAsDeleted()) { // Script not present yet?
            seg = s->_segMan->instantiateScript(script);
            scr = s->_segMan->getScript(seg);
        }*/

        var temp = scr.validateExportFunc(pubFunct, false);

        if (getSciVersion() == SciVersion.SCI_VERSION_3)
            temp += scr.getCodeBlockOffset();

        if (!temp) {
            Debug.error("Request for invalid exported function" + pubFunct + " of script " + scriptNum);
            return null;
        }

        var xstack = new ExecStack(callingObj, callingObj, sp, argc, argp,
                            seg, new Reg(seg, temp), -1, pubFunct, -1,
                            state.executionStack.length - 1, ExecStackType.EXEC_STACK_TYPE_CALL);
        state.executionStack.push(xstack);
        return xstack;
    }
    
    var validateVariable = function(r, stack_base, type, max, index) {
        var names = ["global", "local", "temp", "param"];
    
        if (index < 0 || index >= max.index) {
            var txt = "[VM] Attempt to use invalid " + names[type] + " variable 0x" + index.toString(16);
            
            if (max == 0)
                txt += "(variable type invalid)";
            else
                txt += "(out of range [0.." + (max - 1) + "])";
    
            if (type == VariableTypes.VAR_PARAM || type == VariableTypes.VAR_TEMP) {
                var total_offset = r.index - stack_base;
                if (total_offset < 0 || total_offset >= VM_STACK_SIZE) {
                    // Fatal, as the game is trying to do an OOB access
                    Debug.error(txt + "[VM] Access would be outside even of the stack; access denied");
                    return false;
                } else {
                    Debug.log("VM", txt);
                    Debug.log("VM", "[VM] Access within stack boundaries; access granted.");
                    return true;
                }
            }
            return false;
        }
        return true;
    }
    
    var validateProperty = function(obj, index) {
        // A static dummy reg_t, which we return if obj or index turn out to be
        // invalid. Note that we cannot just return NULL_REG, because client code
        // may modify the value of the returned reg_t.
        var dummyReg = new Reg(0, 0);
    
        // If this occurs, it means there's probably something wrong with the garbage
        // collector, so don't hide it with fake return values
        if (obj == null)
            Debug.error("validate_property: Sending to disposed object");
    
        if (getSciVersion() == SciVersion.SCI_VERSION_3)
            index = obj.locateVarSelector(index);
        else
            index >>= 1;
    
        if (index < 0 || index >= obj.getVarCount()) {
            // This is same way sierra does it and there are some games, that contain such scripts like
            //  iceman script 998 (fred::canBeHere, executed right at the start)
//            debugC(kDebugLevelVM, "[VM] Invalid property #%d (out of [0..%d]) requested from object %04x:%04x (%s)",
  //              index, obj->getVarCount(), PRINT_REG(obj->getPos()), s->_segMan->getObjectName(obj->getPos()));
            return dummyReg;
        }
    
        return obj.getVariableRef(index);
    }


    // FIXME
    var readVar = function(type, index) {
        if (validateVariable(state.variables[type], state.stackBase, type, state.variablesMax[type], index)) {
            if (state.variables[type].getValue(index).segment == 0xffff) {
                switch (type) {
                case VariableTypes.VAR_TEMP: {
                    // Uninitialized read on a temp
                    //  We need to find correct replacements for each situation manually
/*                    SciTrackOriginReply originReply;
                    SciWorkaroundSolution solution = trackOriginAndFindWorkaround(index, uninitializedReadWorkarounds, &originReply);
                    if (solution.type == WORKAROUND_NONE) {
    #ifdef RELEASE_BUILD
                        // If we are running an official ScummVM release -> fake 0 in unknown cases
                        warning("Uninitialized read for temp %d from method %s::%s (room %d, script %d, localCall %x)",
                        index, originReply.objectName.c_str(), originReply.methodName.c_str(), s->currentRoomNumber(),
                        originReply.scriptNr, originReply.localCallOffset);
    
                        s->variables[type][index] = NULL_REG;
                        break;
    #else
                        error("Uninitialized read for temp %d from method %s::%s (room %d, script %d, localCall %x)",
                        index, originReply.objectName.c_str(), originReply.methodName.c_str(), s->currentRoomNumber(),
                        originReply.scriptNr, originReply.localCallOffset);
    #endif
                    }
                    assert(solution.type == WORKAROUND_FAKE);*/
                    //state.variables[type].setValue(index, new Reg(0, solution.value));
                    
                    state.variables[type].setValue(index, new Reg(0, 0));
                    break;
                }
                case VariableTypes.VAR_PARAM:
                    // Out-of-bounds read for a parameter that goes onto stack and hits an uninitialized temp
                    //  We return 0 currently in that case
                    Debug.log("VM", "[VM] Read for a parameter goes out-of-bounds, onto the stack and gets uninitialized temp");
                    return new Reg(0, 0);
                default:
                    break;
                }
                Debug.error("Segment is 0xFFFF");
            }
            return state.variables[type].getValue(index).clone();
        } else
            return state.acc.clone();
    }

    // FIXME
    var writeVar = function(type, index, value) {
        value = value.clone();
        
        if(value.segment == 0xFFFF) {
            Debug.error("Value segment is 0xFFFF");
        }
    
        if (validateVariable(state.variables[type], state.stackBase, type, state.variablesMax[type], index)) {
    
            // WORKAROUND: This code is needed to work around a probable script bug, or a
            // limitation of the original SCI engine, which can be observed in LSL5.
            //
            // In some games, ego walks via the "Grooper" object, in particular its "stopGroop"
            // child. In LSL5, during the game, ego is swapped from Larry to Patti. When this
            // happens in the original interpreter, the new actor is loaded in the same memory
            // location as the old one, therefore the client variable in the stopGroop object
            // points to the new actor. This is probably why the reference of the stopGroop
            // object is never updated (which is why I mentioned that this is either a script
            // bug or some kind of limitation).
            //
            // In our implementation, each new object is loaded in a different memory location,
            // and we can't overwrite the old one. This means that in our implementation,
            // whenever ego is changed, we need to update the "client" variable of the
            // stopGroop object, which points to ego, to the new ego object. If this is not
            // done, ego's movement will not be updated properly, so the result is
            // unpredictable (for example in LSL5, Patti spins around instead of walking).
            if (index == 0 && type == VariableTypes.VAR_GLOBAL && getSciVersion() > SciVersion.SCI_VERSION_0_EARLY) {	// global 0 is ego
                var stopGroopPos = SegManager.findObjectByName("stopGroop");
                if (!stopGroopPos.isNull()) {	// does the game have a stopGroop object?
                    // Find the "client" member variable of the stopGroop object, and update it
                    var varp = new ObjVarRef();
                    if (lookupSelector(stopGroopPos, SelectorCache.client, varp, null) == SelectorType.Variable) {
                        var clientVar = varp.getPointer();
                        clientVar.set(value);
                    }
                }
            }
    
            // If we are writing an uninitialized value into a temp, we remove the uninitialized segment
            //  this happens at least in sq1/room 44 (slot-machine), because a send is missing parameters, then
            //  those parameters are taken from uninitialized stack and afterwards they are copied back into temps
            //  if we don't remove the segment, we would get false-positive uninitialized reads later
            if (type == VariableTypes.VAR_TEMP && value.segment == 0xffff)
                value.segment = 0;
    
            state.variables[type].setValue(index, value);
    
            // If the game is trying to change its speech/subtitle settings, apply the ScummVM audio
            // options first, if they haven't been applied yet
            /*if (type == VAR_GLOBAL && index == 90 && !g_sci->getEngineState()->_syncedAudioOptions) {
                g_sci->syncIngameAudioOptions();
                g_sci->getEngineState()->_syncedAudioOptions = true;
            }*/
        }
    }

    
    var init = function() {
        state.stack = SegManager.allocStack(VM_STACK_SIZE);
        state.stackTop = VM_STACK_SIZE;
    };
    
    var update = function() {
        var gameTicks = Engine.getTicks();
    
        if(Input.getKey(Input.down)) {
            maxCycles += 10;
        }
    
        if(maxCycles <= 0)
            return;
            
        if(state.waitTicks > 0) {
//            state.waitTicks --;
            state.waitTicks -= (gameTicks - state.lastWaitTime);
            if(state.waitTicks < 0)
                state.waitTicks = 0;
            return;
        }
        
        for(var cycle = 0; maxCycles > 0 && state.waitTicks == 0 && cycle<cyclesPerFrame && mainRunFunction != null && FileLoader.finishedLoading(); cycle++) {
            try {
                if(mainRunFunction() == false) {
                    mainRunFunction = null;
                }
            }
            catch(exception) {
                if(exception == VM_LOAD_STALL) {
                    break;
                }
                else {
                    Debug.error(exception.stack);
                    throw exception;
                }
            }
            
            maxCycles --;
            
            if(state.lastWaitTime == gameTicks) {
               break;
            }
        }
        
        if(cycle == cyclesPerFrame) {
            Debug.warn("Need more cycles per frame!");
        }
    }
    
    var run = function() {
        var newRun = createRunFunction();
        
        if(mainRunFunction == null) {
            mainRunFunction = newRun;
        }
        else {
            var maxCycles = 1000;
            for(var cycle = 0; cycle<maxCycles; cycle++) {
                if(newRun() == false)
                    return;
            }
            
            Debug.error("Out of cycles!");
        }
    }
    
    var dumpStack = function() {
        Debug.log("sp: " + state.xs.sp.toString(16) + " fp: " + state.xs.fp.toString(16));
        for(var x = state.xs.sp - 1; x >= state.stackBase; x--) {
            Debug.log("0x" + x.toString(16) + " = " + state.stack[x].toString());
        }
    }
    
    var createRunFunction = function() {
        // Execution variables
        var r_temp = new Reg(0, 0);
        var xs_new = null;
        var temp;
        var s_temp; // Temporary stack pointer
        var obj;
        var scr = null;
        var localScript;
        var oldExecutionStackBase;
        var prevOpcode = 0;
        // end of execution variables
    
        state.rest = 0;	// &rest adjusts the parameter count by this value
        // Current execution data:
        if(state.executionStack.length > 0) {
            state.xs = state.executionStack[state.executionStack.length - 1];
        }
        
        obj = SegManager.getObject(state.xs.objp);
        localScript = SegManager.getScriptFromSegment(state.xs.localSegment);
        oldExecutionStackBase = state.executionStackBase;

        // Used to detect the stack bottom, for "physical" returns
    
        if (localScript == null)
            Debug.error("run_vm(): program counter gone astray (local_script pointer is null)");
    
        state.executionStackBase = state.executionStack.length - 1;
    
        state.variablesSegment[VariableTypes.VAR_TEMP] = SegManager.findSegmentByType(SegmentType.SEG_TYPE_STACK);
        state.variablesSegment[VariableTypes.VAR_PARAM] = SegManager.findSegmentByType(SegmentType.SEG_TYPE_STACK);
        state.variablesBase[VariableTypes.VAR_TEMP] = new ArrayPtr(state.stack, state.stackBase);
        state.variablesBase[VariableTypes.VAR_PARAM] = new ArrayPtr(state.stack, state.stackBase);
    
        state.executionStackPosChanged = true;

        return function() { 
            if (state.executionStackPosChanged) {
                scr = SegManager.getScriptFromSegment(state.xs.pc.segment);
                if (scr == null) {
                    Debug.error("No script in segment " + state.xs.pc.segment);
                }
                state.xs = state.executionStack[state.executionStack.length - 1];
                state.executionStackPosChanged = false;
    
                obj = SegManager.getObject(state.xs.objp);
                localScript = SegManager.getScriptFromSegment(state.xs.localSegment);
                if (localScript == null) {
                    Debug.error("Could not find local script from segment " + state.xs.localSegment);
                } else {
                    state.variablesSegment[VariableTypes.VAR_LOCAL] = localScript.getLocalsSegment();
                    state.variablesBase[VariableTypes.VAR_LOCAL] = localScript.getLocalsBegin();
                    state.variables[VariableTypes.VAR_LOCAL] = localScript.getLocalsBegin();
                    state.variablesMax[VariableTypes.VAR_LOCAL] = localScript.localsCount;
                    state.variablesMax[VariableTypes.VAR_TEMP] = state.xs.sp - state.xs.fp;
                    state.variablesMax[VariableTypes.VAR_PARAM] = state.xs.argc + 1;
                }
                state.variables[VariableTypes.VAR_TEMP] = new ArrayPtr(state.stack, state.xs.fp);
                state.variables[VariableTypes.VAR_PARAM] = new ArrayPtr(state.stack, state.xs.variablesArgp);
            }
    
            if (state.xs.sp < state.xs.fp)
                Debug.error("run_vm(): stack underflow!");
    
            state.variablesMax[VariableTypes.VAR_TEMP] = state.xs.sp - state.xs.fp;
    
            if (state.xs.pc.offset >= scr.buf.getLength())
                Debug.error("run_vm(): program counter gone astray");
    
            // Get opcode
            var op = readVMInstruction(scr.buf, state.xs.pc.offset);
            state.xs.pc.offset += op.offset;
            var opparams = op.params;
    
            // Check for infinite loop!
            if (prevOpcode != 0xFF) {
                if (prevOpcode == opcode.op_eq_  || prevOpcode == opcode.op_ne_  ||
                    prevOpcode == opcode.op_gt_  || prevOpcode == opcode.op_ge_  ||
                    prevOpcode == opcode.op_lt_  || prevOpcode == opcode.op_le_  ||
                    prevOpcode == opcode.op_ugt_ || prevOpcode == opcode.op_uge_ ||
                    prevOpcode == opcode.op_ult_ || prevOpcode == opcode.op_ule_) {
                    if (op.opcode == opcode.op_jmp)
                        error("Infinite loop detected in script " + scr.getScriptNumber());
                }
            }
    
            prevOpcode = op.opcode;
            
            
            var debugOutput = "VM [" + state.xs.pc.toString() + "] :" + enumToString(opcode, op.opcode) + " ";
            for(var param = 0; param<op.params.length; param++) {
                debugOutput += op.params[param];
                if(param != op.params.length - 1) {
                    debugOutput += ", ";
                }
            }
            debugOutput += " acc: " + state.acc.toString() + " script: " + scr.scriptNum + " local script: " + localScript.scriptNum;
            Debug.log("VM", debugOutput);
            
            
            //dumpStack();
            //Disassembler.disassembleCode(scr.buf, state.xs.pc.offset, state.xs.pc.offset + 20);
            
            switch (op.opcode) {
    
                case opcode.op_bnot: // 0x00 (00)
                    // Binary not
                    state.acc = new Reg(0, 0xffff ^ state.acc.requireUint16());
                    break;
        
                case opcode.op_add: // 0x01 (01)
                    state.acc = pop32().add(state.acc);
                    break;
        
                case opcode.op_sub: // 0x02 (02)
                    state.acc = pop32().subtract(state.acc);
                    break;
        
                case opcode.op_mul: // 0x03 (03)
                    state.acc = pop32().multiply(state.acc);
                    break;
        
                case opcode.op_div: // 0x04 (04)
                    // we check for division by 0 inside the custom reg_t division operator
                    state.acc = pop32().divide(state.acc);
                    break;
        
                case opcode.op_mod: // 0x05 (05)
                    // we check for division by 0 inside the custom reg_t modulo operator
                    state.acc = pop32().modulo(state.acc);
                    break;
        
                case opcode.op_shr: // 0x06 (06)
                    // Shift right logical
                    state.acc = pop32().shiftRight(state.acc);
                    break;
        
                case opcode.op_shl: // 0x07 (07)
                    // Shift left logical
                    state.acc = pop32().shiftLeft(state.acc);
                    break;
        
                case opcode.op_xor: // 0x08 (08)
                    state.acc = pop32().bitwiseXor(state.acc);
                    break;
        
                case opcode.op_and: // 0x09 (09)
                    state.acc = pop32().bitwiseAnd(state.acc);
                    break;
        
                case opcode.op_or: // 0x0a (10)
                    state.acc = pop32().bitwiseOr(state.acc);
                    break;
        
                case opcode.op_neg:	// 0x0b (11)
                    state.acc = new Reg(0, -state.acc.requireSint16());
                    break;
        
                case opcode.op_not: // 0x0c (12)
                    state.acc = new Reg(0, !(state.acc.offset != 0 || state.acc.segment != 0) ? 1 : 0);
                    // Must allow pointers to be negated, as this is used for checking whether objects exist
                    break;
        
                case opcode.op_eq_: // 0x0d (13)
                    state.prev = state.acc;
                    state.acc  = new Reg(0, pop32().equals(state.acc) ? 1 : 0);
                    break;
        
                case opcode.op_ne_: // 0x0e (14)
                    state.prev = state.acc;
                    state.acc  = new Reg(0, pop32().notEqual(state.acc) ? 1 : 0);
                    break;
        
                case opcode.op_gt_: // 0x0f (15)
                    state.prev = state.acc;
                    state.acc  = new Reg(0, pop32().greaterThan(state.acc) ? 1 : 0);
                    break;
        
                case opcode.op_ge_: // 0x10 (16)
                    state.prev = state.acc;
                    state.acc  = new Reg(0, pop32().greaterEqual(state.acc) ? 1 : 0);
                    break;
        
                case opcode.op_lt_: // 0x11 (17)
                    state.prev = state.acc;
                    state.acc  = new Reg(0, pop32().lessThan(state.acc) ? 1 : 0);
                    break;
        
                case opcode.op_le_: // 0x12 (18)
                    state.prev = state.acc;
                    state.acc  = new Reg(0, pop32().lessEqual(state.acc) ? 1 : 0);
                    break;
        
                case opcode.op_ugt_: // 0x13 (19)
                    // > (unsigned)
                    state.prev = state.acc;
                    state.acc  = new Reg(0, pop32().greaterThanU(state.acc) ? 1 : 0);
                    break;
        
                case opcode.op_uge_: // 0x14 (20)
                    // >= (unsigned)
                    state.prev = state.acc;
                    state.acc  = new Reg(0, pop32().greaterEqualU(state.acc) ? 1 : 0);
                    break;
        
                case opcode.op_ult_: // 0x15 (21)
                    // < (unsigned)
                    state.prev = state.acc;
                    state.acc  = new Reg(0, pop32().lessThanU(state.acc) ? 1 : 0);
                    break;
        
                case opcode.op_ule_: // 0x16 (22)
                    // <= (unsigned)
                    state.prev = state.acc;
                    state.acc  = new Reg(0, pop32().lessEqualU(state.acc) ? 1 : 0);
                    break;
        
                case opcode.op_bt: // 0x17 (23)
                    // Branch relative if true
                    if(state.acc.offset != 0 || state.acc.segment != 0) {
                        Debug.log("Branch", "[VM] op_bt branched at pc " + state.xs.pc.offset);
                        state.xs.pc.offset += opparams[0];
                    }
                    else {
                        Debug.log("Branch", "[VM] op_bt did not branch at pc " + state.xs.pc.offset);
                    }
        
                    if(state.xs.pc.offset >= localScript.buf.getLength()) {
                        Debug.error("[VM] op_bt: request to jump past the end of script " + localScript.scriptNum);
                    }
                    break;
        
                case opcode.op_bnt: // 0x18 (24)
                    // Branch relative if not true
                    if (!(state.acc.offset != 0 || state.acc.segment != 0)) {
                        Debug.log("Branch", "[VM] op_bnt branched at pc " + state.xs.pc.offset);
                        state.xs.pc.offset += opparams[0];
                    }
                    else {
                        Debug.log("Branch", "[VM] op_bnt did not branch at pc " + state.xs.pc.offset);
                    }
        
                    if(state.xs.pc.offset >= localScript.buf.getLength()) {
                        Debug.error("[VM] op_bnt: request to jump past the end of script " + localScript.scriptNum);
                    }
                    break;
        
                case opcode.op_jmp: // 0x19 (25)
                    state.xs.pc.offset += opparams[0];
    
                    if(state.xs.pc.offset >= localScript.buf.getLength()) {
                        Debug.error("[VM] op_jmp: request to jump past the end of script " + localScript.scriptNum);
                    }
                    break;
        
                case opcode.op_ldi: // 0x1a (26)
                    // Load data immediate
                    state.acc = new Reg(0, opparams[0]);
                    break;
        
                case opcode.op_push: // 0x1b (27)
                    // Push to stack
                    push32(state.acc);
                    break;
        
                case opcode.op_pushi: // 0x1c (28)
                    // Push immediate
                    push(opparams[0]);
                    break;
        
                case opcode.op_toss: // 0x1d (29)
                    // TOS (Top Of Stack) subtract
                    state.xs.sp--;
                    break;
        
                case opcode.op_dup: // 0x1e (30)
                    // Duplicate TOD (Top Of Stack) element
                    r_temp = state.stack[state.xs.sp - 1].clone();
                    push32(r_temp);
                    break;
        
                case opcode.op_link: // 0x1f (31)
                    // We shouldn't initialize temp variables at all
                    //  We put special segment 0xFFFF in there, so that uninitialized reads can get detected
                    for (var i = 0; i < opparams[0]; i++)
                        state.stack[state.xs.sp + i] = new Reg(0xffff, 0);
        
                    state.xs.sp += opparams[0];
                    break;
        
                case opcode.op_call: { // 0x20 (32)
                    // Call a script subroutine
                    var argc = (opparams[1] >> 1) // Given as offset, but we need count
                               + 1 + state.rest;
                    var callBasePos = state.xs.sp - argc;
                    var callBase = state.stack[callBasePos];
                    
                    state.stack[state.xs.sp + 1].offset += state.rest;
        
                    var localCallOffset = state.xs.pc.offset + opparams[0];
        
                    var xstack = new ExecStack(state.xs.objp, state.xs.objp, state.xs.sp,
                                    (callBase.requireUint16()) + state.rest, callBasePos,
                                    state.xs.localSegment, new Reg(state.xs.pc.segment, localCallOffset),
                                    NULL_SELECTOR, -1, localCallOffset, state.executionStack.length - 1,
                                    ExecStackType.EXEC_STACK_TYPE_CALL);
        
                    state.executionStack.push(xstack);
                    xs_new = xstack;
        
                    state.rest = 0; // Used up the &rest adjustment
                    state.xs.sp = callBasePos;
        
                    state.executionStackPosChanged = true;
                    break;
                }
        
                case opcode.op_callk: { // 0x21 (33)
                    // Run the garbage collector, if needed
                    // TODO
                    /*if (s->gcCountDown-- <= 0) {
                        s->gcCountDown = s->scriptGCInterval;
                        run_gc(s);
                    }*/
                    var oldSp = state.xs.sp;
                    var oldRest = state.rest;
        
                    // Call kernel function
                    state.xs.sp -= (opparams[1] >> 1) + 1;
        
                    var oldScriptHeader = (getSciVersion() == SciVersion.SCI_VERSION_0_EARLY);
                    if (!oldScriptHeader)
                        state.xs.sp -= state.rest;
        
                    var argc = state.stack[state.xs.sp].requireUint16();
        
                    if (!oldScriptHeader)
                        argc += state.rest;
        
                    try {
                        callKernelFunc(opparams[0], argc);
                    }
                    catch(exception) {
                        if(exception == VM_LOAD_STALL) {
                            state.xs.pc.offset -= op.offset;
                            state.xs.sp = oldSp;
                            state.rest = oldRest;
                        }
                        throw exception;
                    }
        
                    if (!oldScriptHeader)
                        state.rest = 0;
        
                    // Calculate xs again: The kernel function might
                    // have spawned a new VM
        
                    xs_new = state.executionStack[state.executionStack.length - 1];
                    state.executionStackPosChanged = true;
        
                    // If a game is being loaded, stop processing
                    // TODO
                    //if (s->abortScriptProcessing != kAbortNone)
                      //  return; // Stop processing
        
                    break;
                }
        
                case opcode.op_callb: // 0x22 (34)
                    // Call base script
                    temp = ((opparams[1] >> 1) + state.rest + 1);
                    s_temp = state.xs.sp;
                    state.xs.sp -= temp;
        
                    state.stack[state.xs.sp].offset += state.rest;
                    
                    try {
                        xs_new = executeMethod(0, opparams[0], s_temp, state.xs.objp,
                                                state.stack[state.xs.sp].offset, state.xs.sp);
                    }
                    catch(exception) {
                        if(exception == VM_LOAD_STALL) {
                            state.xs.pc.offset -= op.offset;
                            state.stack[state.xs.sp].offset -= state.rest;
                            state.xs.sp = s_temp;
                        }
                        throw exception;
                    }
                                            
                    state.rest = 0; // Used up the &rest adjustment
                    if (xs_new != null)    // in case of error, keep old stack
                        state.executionStackPosChanged = true;
                    break;
        
                case opcode.op_calle: // 0x23 (35)
                    // Call external script
                    temp = ((opparams[2] >> 1) + state.rest + 1);
                    s_temp = state.xs.sp;
                    state.xs.sp -= temp;
        
                    state.stack[state.xs.sp].offset += state.rest;
                    
                    try {
                        xs_new = executeMethod(opparams[0], opparams[1], s_temp, state.xs.objp,
                                                state.stack[state.xs.sp].offset, state.xs.sp);
                    }
                    catch(exception) {
                        if(exception == VM_LOAD_STALL) {
                            state.xs.pc.offset -= op.offset;
                            state.stack[state.xs.sp].offset -= state.rest;
                            state.xs.sp = s_temp;
                        }
                        throw exception;
                    }
                                            
                    state.rest = 0; // Used up the &rest adjustment
        
                    if (xs_new != null)  // in case of error, keep old stack
                        state.executionStackPosChanged = true;
                    break;
        
                case opcode.op_ret: // 0x24 (36)
                    // Return from an execution loop started by call, calle, callb, send, self or super
                    do {
                        var old_sp2 = state.xs.sp;
                        var old_fp = state.xs.fp;
                        var old_xs = state.executionStack[state.executionStack.length - 1];
        
                        if (state.executionStack.length - 1 == state.executionStackBase) { // Have we reached the base?
                            state.executionStackBase = oldExecutionStackBase; // Restore stack base
        
                            state.executionStack.pop();
        
                            state.executionStackPosChanged = true;
                            
                            return false; // "Hard" return
                        }
        
                        if (old_xs.type == ExecStackType.EXEC_STACK_TYPE_VARSELECTOR) {
                            // varselector access?
                            var varPtr = old_xs.getVarPointer();
                            if (old_xs.argc > 0) // write?
                                varPtr.set(state.stack[old_xs.variablesArgp + 1]);
                            else // No, read
                                state.acc.set(varPtr);
                        }
        
                        // Not reached the base, so let's do a soft return
                        state.executionStack.pop();
                        state.executionStackPosChanged = true;
                        state.xs = state.executionStack[state.executionStack.length - 1];
        
                        if (state.xs.sp == CALL_SP_CARRY // Used in sends to 'carry' the stack pointer
                                || state.xs.type != ExecStackType.EXEC_STACK_TYPE_CALL) {
                            state.xs.sp = old_sp2;
                            state.xs.fp = old_fp;
                        }
        
                    } while (state.xs.type == ExecStackType.EXEC_STACK_TYPE_VARSELECTOR);
                    // Iterate over all varselector accesses
                    state.executionStackPosChanged = true;
                    xs_new = state.xs;
        
                    break;
        
                case opcode.op_send: // 0x25 (37)
                    // Send for one or more selectors
                    temp = state.xs.sp;
                    state.xs.sp -= ((opparams[0] >> 1) + state.rest); // Adjust stack
        
                    state.stack[state.xs.sp + 1].offset += state.rest;
                    xs_new = sendSelector(state.acc, state.acc, temp,
                                            (opparams[0] >> 1) + state.rest, state.xs.sp);
        
                    if (xs_new != null && xs_new != state.xs)
                        state.executionStackPosChanged = true;
        
                    state.rest = 0;
        
                    break;
        
                /*case 0x26: // (38)
                case 0x27: // (39)
                    if (getSciVersion() == SciVersion.SCI_VERSION_3) {
                        if (extOpcode == 0x4c)
                            state.acc = obj->getInfoSelector();
                        else if (extOpcode == 0x4d)
                            PUSH32(obj->getInfoSelector());
                        else if (extOpcode == 0x4e)
                            state.acc = obj->getSuperClassSelector();	// TODO: is this correct?
                        // TODO: There are also opcodes in
                        // here to get the superclass, and possibly the species too.
                        else
                            error("Dummy opcode 0x%x called", opcode);	// should never happen
                    } else
                        error("Dummy opcode 0x%x called", opcode);	// should never happen
                    break;
        */
                case opcode.op_class: // 0x28 (40)
                    // Get class address
                    try {
                        r_temp = SegManager.getClassAddress(opparams[0], ScriptLoadType.SCRIPT_GET_LOCK,
                                                        state.xs.pc);
                    }
                    catch(exception) {
                        if(exception == VM_LOAD_STALL) {
                            state.xs.pc.offset -= op.offset;
                        }
                        throw exception;
                    }
                    
                    state.acc = r_temp;
                    break;
        
                case 0x29: // (41)
                    error("Dummy opcode 0x%x called", opcode);	// should never happen
                    break;
        
                case opcode.op_self: // 0x2a (42)
                    // Send to self
                    s_temp = state.xs.sp;
                    state.xs.sp -= ((opparams[0] >> 1) + state.rest); // Adjust stack
        
                    state.stack[state.xs.sp + 1].offset += state.rest;
                    xs_new = sendSelector(state.xs.objp, state.xs.objp,
                                            s_temp, (opparams[0] >> 1) + state.rest,
                                            state.xs.sp);
        
                    if (xs_new != null && xs_new != state.xs)
                        state.executionStackPosChanged = true;
        
                    state.rest = 0;
                    break;
        
                case opcode.op_super: // 0x2b (43)
                    // Send to any class
                    try {
                        r_temp = SegManager.getClassAddress(opparams[0], ScriptLoadType.SCRIPT_GET_LOAD, state.xs.pc);
                    }
                    catch(exception) {
                        if(exception == VM_LOAD_STALL) {
                            state.xs.pc.offset -= op.offset;
                        }
                        throw exception;
                    }
        
                    if (!r_temp.isPointer())
                        Debug.error("[VM]: Invalid superclass in object");
                    else {
                        s_temp = state.xs.sp;
                        state.xs.sp -= ((opparams[1] >> 1) + state.rest); // Adjust stack
        
                        state.stack[state.xs.sp + 1].offset += state.rest;
                        xs_new = sendSelector(r_temp, state.xs.objp, s_temp,
                                                (opparams[1] >> 1) + state.rest,
                                                state.xs.sp);
        
                        if (xs_new != null && xs_new != state.xs)
                            state.executionStackPosChanged = true;
        
                        state.rest = 0;
                    }
        
                    break;
        
                case opcode.op_rest: // 0x2c (44)
                    // Pushes all or part of the parameter variable list on the stack
                    temp = opparams[0] & 0xFFFF; // First argument as uint16
                    state.rest = state.xs.argc - temp + 1; // +1 because temp counts the paramcount while argc doesn't
                    if(state.rest < 0)
                        state.rest = 0;
        
                    for (; temp <= state.xs.argc; temp++)
                        push32(state.stack[state.xs.variablesArgp + temp]);
        
                    break;
        
                case opcode.op_lea: // 0x2d (45)
                    // Load Effective Address
                    temp = opparams[0] >> 1;
                    var_number = temp & 0x03; // Get variable type
        
                    // Get variable block offset
                    r_temp = new Reg(0, 0);
                    r_temp.segment = state.variablesSegment[var_number];
                    r_temp.offset = state.variables[var_number].index - state.variablesBase[var_number].index;
        
                    if (temp & 0x08)  // Add accumulator offset if requested
                        r_temp.offset += state.acc.requireSint16();
        
                    r_temp.offset += opparams[1];  // Add index
                    r_temp.offset *= 2; // variables are 16 bit
                    // That's the immediate address now
                    state.acc = r_temp.clone();
                    break;
        
        
                case opcode.op_selfID: // 0x2e (46)
                    // Get 'self' identity
                    state.acc = state.xs.objp.clone();
                    break;
        
                case 0x2f: // (47)
                    error("Dummy opcode 0x%x called", opcode);	// should never happen
                    break;
        
                case opcode.op_pprev: // 0x30 (48)
                    // Pushes the value of the prev register, set by the last comparison
                    // bytecode (eq?, lt?, etc.), on the stack
                    push32(state.prev);
                    break;
        
                case opcode.op_pToa: // 0x31 (49)
                    // Property To Accumulator
                    state.acc = validateProperty(obj, opparams[0]).clone();
                    break;
        
                case opcode.op_aTop: // 0x32 (50)
                    // Accumulator To Property
                    validateProperty(obj, opparams[0]).set(state.acc);
                    break;
        
                case opcode.op_pTos: // 0x33 (51)
                    // Property To Stack
                    push32(validateProperty(obj, opparams[0]).clone());
                    break;
        
                case opcode.op_sTop: // 0x34 (52)
                    // Stack To Property
                    validateProperty(obj, opparams[0]).set(pop32());
                    break;
        
                case opcode.op_ipToa: // 0x35 (53)
                case opcode.op_dpToa: // 0x36 (54)
                case opcode.op_ipTos: // 0x37 (55)
                case opcode.op_dpTos: // 0x38 (56)
                    {
                    // Increment/decrement a property and copy to accumulator,
                    // or push to stack
                    var opProperty = validateProperty(obj, opparams[0]); 
                    if ((op.opcode & 1) != 0)
                        opProperty.offset += 1;
                    else
                        opProperty.offset -= 1;
                        
                    opProperty.offset &= 0xFFFF;
        
                    if (op.opcode == opcode.op_ipToa || op.opcode == opcode.op_dpToa)
                        state.acc = opProperty.clone();
                    else
                        push32(opProperty.clone());
                    break;
                }
        
                case opcode.op_lofsa: // 0x39 (57)
                case opcode.op_lofss: // 0x3a (58)
                    // Load offset to accumulator or push to stack
                    r_temp = new Reg(state.xs.pc.segment, 0);
        
                    switch (detectLofsType()) {
                    case SciVersion.SCI_VERSION_0_EARLY:
                        r_temp.offset = state.xs.pc.offset + opparams[0];
                        break;
                    case SciVersion.SCI_VERSION_1_MIDDLE:
                        r_temp.offset = opparams[0];
                        break;
                    case SciVersion.SCI_VERSION_1_1:
                        r_temp.offset = opparams[0] + localScript.getScriptSize();
                        break;
                    case SciVersion.SCI_VERSION_3:
                        // In theory this can break if the variant with a one-byte argument is
                        // used. For now, assume it doesn't happen.
//                        r_temp.offset = local_script->relocateOffsetSci3(s->xs->addr.pc.offset-2);
                        break;
                    default:
                        Debug.error("Unknown lofs type");
                    }
                    
                    r_temp.offset &= 0xFFFF;
        
                    if (r_temp.offset >= scr.getBufSize())
                        Debug.error("VM: lofsa/lofss operation overflowed:");
//                        %04x:%04x beyond end"                               " of script (at %04x)", PRINT_REG(r_temp), scr->getBufSize());
        
                    if (op.opcode == opcode.op_lofsa)
                        state.acc = r_temp.clone();
                    else
                        push32(r_temp);
                    break;
        
                case opcode.op_push0: // 0x3b (59)
                    push(0);
                    break;
        
                case opcode.op_push1: // 0x3c (60)
                    push(1);
                    break;
        
                case opcode.op_push2: // 0x3d (61)
                    push(2);
                    break;
        
                case opcode.op_pushSelf: // 0x3e (62)
                    // Compensate for a bug in non-Sierra compilers, which seem to generate
                    // pushSelf instructions with the low bit set. This makes the following
                    // heuristic fail and leads to endless loops and crashes. Our
                    // interpretation of this seems correct, as other SCI tools, like for
                    // example SCI Viewer, have issues with these scripts (e.g. script 999
                    // in Circus Quest). Fixes bug #3038686.
                    if (!(op.extOpcode & 1)) {  // || g_sci->getGameId() == GID_FANMADE) {
                        push32(state.xs.objp);
                    } else {
                        // Debug opcode op_file
                    }
                    break;
        
                case opcode.op_line: // 0x3f (63)
                    // Debug opcode (line number)
                    break;
        
                case opcode.op_lag: // 0x40 (64)
                case opcode.op_lal: // 0x41 (65)
                case opcode.op_lat: // 0x42 (66)
                case opcode.op_lap: // 0x43 (67)
                    // Load global, local, temp or param variable into the accumulator
                case opcode.op_lagi: // 0x48 (72)
                case opcode.op_lali: // 0x49 (73)
                case opcode.op_lati: // 0x4a (74)
                case opcode.op_lapi: // 0x4b (75)
                    // Same as the 4 ones above, except that the accumulator is used as
                    // an additional index
                    var_type = op.opcode & 0x3; // Gets the variable type: g, l, t or p
                    var_number = opparams[0] + (op.opcode >= opcode.op_lagi ? state.acc.requireSint16() : 0);
                    state.acc = readVar(var_type, var_number);
                    break;
        
                case opcode.op_lsg: // 0x44 (68)
                case opcode.op_lsl: // 0x45 (69)
                case opcode.op_lst: // 0x46 (70)
                case opcode.op_lsp: // 0x47 (71)
                    // Load global, local, temp or param variable into the stack
                case opcode.op_lsgi: // 0x4c (76)
                case opcode.op_lsli: // 0x4d (77)
                case opcode.op_lsti: // 0x4e (78)
                case opcode.op_lspi: // 0x4f (79)
                    // Same as the 4 ones above, except that the accumulator is used as
                    // an additional index
                    var_type = op.opcode & 0x3; // Gets the variable type: g, l, t or p
                    var_number = opparams[0] + (op.opcode >= opcode.op_lsgi ? state.acc.requireSint16() : 0);
                    push32(readVar(var_type, var_number));
                    break;

                case opcode.op_sag: // 0x50 (80)
                case opcode.op_sal: // 0x51 (81)
                case opcode.op_sat: // 0x52 (82)
                case opcode.op_sap: // 0x53 (83)
                    // Save the accumulator into the global, local, temp or param variable
                case opcode.op_sagi: // 0x58 (88)
                case opcode.op_sali: // 0x59 (89)
                case opcode.op_sati: // 0x5a (90)
                case opcode.op_sapi: // 0x5b (91)
                    // Save the accumulator into the global, local, temp or param variable,
                    // using the accumulator as an additional index
                    var_type = op.opcode & 0x3; // Gets the variable type: g, l, t or p
                    var_number = opparams[0] + (op.opcode >= opcode.op_sagi ? state.acc.requireSint16() : 0);
                    if (op.opcode >= opcode.op_sagi)	// load the actual value to store in the accumulator
                        state.acc = pop32();
                    writeVar(var_type, var_number, state.acc);
                    break;
        
                case opcode.op_ssg: // 0x54 (84)
                case opcode.op_ssl: // 0x55 (85)
                case opcode.op_sst: // 0x56 (86)
                case opcode.op_ssp: // 0x57 (87)
                    // Save the stack into the global, local, temp or param variable
                case opcode.op_ssgi: // 0x5c (92)
                case opcode.op_ssli: // 0x5d (93)
                case opcode.op_ssti: // 0x5e (94)
                case opcode.op_sspi: // 0x5f (95)
                    // Same as the 4 ones above, except that the accumulator is used as
                    // an additional index
                    var_type = op.opcode & 0x3; // Gets the variable type: g, l, t or p
                    var_number = opparams[0] + (op.opcode >= opcode.op_ssgi ? state.acc.requireSint16() : 0);
                    writeVar(var_type, var_number, pop32());
                    break;
        
                case opcode.op_plusag: // 0x60 (96)
                case opcode.op_plusal: // 0x61 (97)
                case opcode.op_plusat: // 0x62 (98)
                case opcode.op_plusap: // 0x63 (99)
                    // Increment the global, local, temp or param variable and save it
                    // to the accumulator
                case opcode.op_plusagi: // 0x68 (104)
                case opcode.op_plusali: // 0x69 (105)
                case opcode.op_plusati: // 0x6a (106)
                case opcode.op_plusapi: // 0x6b (107)
                    // Same as the 4 ones above, except that the accumulator is used as
                    // an additional index
                    var_type = op.opcode & 0x3; // Gets the variable type: g, l, t or p
                    var_number = opparams[0] + (op.opcode >= opcode.op_plusagi ? state.acc.requireSint16() : 0);
                    state.acc = readVar(var_type, var_number).add(1);
                    writeVar(var_type, var_number, state.acc);
                    break;
        
                case opcode.op_plussg: // 0x64 (100)
                case opcode.op_plussl: // 0x65 (101)
                case opcode.op_plusst: // 0x66 (102)
                case opcode.op_plussp: // 0x67 (103)
                    // Increment the global, local, temp or param variable and save it
                    // to the stack
                case opcode.op_plussgi: // 0x6c (108)
                case opcode.op_plussli: // 0x6d (109)
                case opcode.op_plussti: // 0x6e (110)
                case opcode.op_plusspi: // 0x6f (111)
                    // Same as the 4 ones above, except that the accumulator is used as
                    // an additional index
                    var_type = op.opcode & 0x3; // Gets the variable type: g, l, t or p
                    var_number = opparams[0] + (op.opcode >= opcode.op_plussgi ? state.acc.requireSint16() : 0);
                    r_temp = readVar(var_type, var_number).add(1);
                    push32(r_temp);
                    writeVar(var_type, var_number, r_temp);
                    break;
        
                case opcode.op_minusag: // 0x70 (112)
                case opcode.op_minusal: // 0x71 (113)
                case opcode.op_minusat: // 0x72 (114)
                case opcode.op_minusap: // 0x73 (115)
                    // Decrement the global, local, temp or param variable and save it
                    // to the accumulator
                case opcode.op_minusagi: // 0x78 (120)
                case opcode.op_minusali: // 0x79 (121)
                case opcode.op_minusati: // 0x7a (122)
                case opcode.op_minusapi: // 0x7b (123)
                    // Same as the 4 ones above, except that the accumulator is used as
                    // an additional index
                    var_type = op.opcode & 0x3; // Gets the variable type: g, l, t or p
                    var_number = opparams[0] + (op.opcode >= opcode.op_minusagi ? state.acc.requireSint16() : 0);
                    state.acc = readVar(var_type, var_number).subtract(1);
                    writeVar(var_type, var_number, state.acc);
                    break;
        
                case opcode.op_minussg: // 0x74 (116)
                case opcode.op_minussl: // 0x75 (117)
                case opcode.op_minusst: // 0x76 (118)
                case opcode.op_minussp: // 0x77 (119)
                    // Decrement the global, local, temp or param variable and save it
                    // to the stack
                case opcode.op_minussgi: // 0x7c (124)
                case opcode.op_minussli: // 0x7d (125)
                case opcode.op_minussti: // 0x7e (126)
                case opcode.op_minusspi: // 0x7f (127)
                    // Same as the 4 ones above, except that the accumulator is used as
                    // an additional index
                    var_type = op.opcode & 0x3; // Gets the variable type: g, l, t or p
                    var_number = opparams[0] + (op.opcode >= opcode.op_minussgi ? state.acc.requireSint16() : 0);
                    r_temp = read_var(var_type, var_number).subtract(1);
                    push32(r_temp);
                    writeVar(var_type, var_number, r_temp);
                    break;
        
                default:
                    Debug.error("run_vm(): illegal opcode " + op.opcode + " " + enumToString(opcode, op.opcode));
    
            } // switch (opcode)
            
            if (state.executionStackPosChanged) // Force initialization
                state.xs = xs_new;
    
            if (state.xs != state.executionStack[state.executionStack.length - 1]) {
                Debug.error("xs is stale; last command was " + enumToString(opcode, op.opcode));
            }
            
            if(typeof state.acc.segment != 'number') {
                Debug.error("Acc corrupted");
                return false;
            }
            
            if(debugReg != null) {
                if(debugReg.offset == 0) {
                    Debug.log("What happened to my debug reg? boo hoo..");
                }
                else {
                    var tempObj = SegManager.getObject(debugReg);
                    if(tempObj.variables[5].offset == 0) {
                        Debug.log("What happened to my debug reg? boo hoo..");
                    }
                }
            }
            
            return true;
        }
    }
    
    reset();
    
    return {
        reset : reset,
        state : state,
        init : init,
        update : update,
        run : run,
        
        dumpStack : dumpStack
    };
})();
var VocabResource = {
	SELECTORS : 997,

	SCI0_MAIN_VOCAB : 0,
	SCI0_PARSE_TREE_BRANCHES : 900,
	SCI0_SUFFIX_VOCAB : 901,

	SCI1_MAIN_VOCAB : 900,
	SCI1_PARSE_TREE_BRANCHES : 901,
	SCI1_SUFFIX_VOCAB : 902,

	ALT_INPUTS : 913
};
// Flags for the signal selector
var ViewSignals = {
	StopUpdate    : 0x0001,
	ViewUpdated   : 0x0002,
	NoUpdate      : 0x0004,
	Hidden        : 0x0008,
	FixedPriority : 0x0010,
	AlwaysUpdate  : 0x0020,
	ForceUpdate   : 0x0040,
	RemoveView    : 0x0080,
	Frozen        : 0x0100, // I got frozen today!!
	//ExtraActor	 : 0x0200, // unused by us, defines all actors that may be included into the background if speed is too slow
	HitObstacle	 : 0x0400, // used in the actor movement code by kDoBresen()
	DoesntTurn	 : 0x0800, // used by _k_dirloop() to determine if an actor can turn or not
	//NoCycler		 : 0x1000, // unused by us
	//IgnoreHorizon : 0x2000, // unused by us, defines actor that can ignore horizon
	IgnoreActor   : 0x4000,
	DisposeMe     : 0x8000
};

function AnimateEntry() {
	this.givenOrderNo;
	this.object = new Reg(0, 0);
	this.viewId = 0;
	this.loopNo = 0;
	this.celNo = 0;
	this.paletteNo = 0;
	this.x = 0;
	this.y = 0;
	this.z = 0;
	this.priority = 0;
	this.signal = 0;
	this.scaleSignal = 0;
	this.scaleX = 0;
	this.scaleY = 0;
	this.celRect = new Rect();
	this.showBitsFlag = false;
	this.castHandle = new Reg(0, 0);
}

var GfxAnimate = (function() {
    var lastCastData = [];
    var ignoreFastCast = true;
    var cache = [];
    var animList = [];
    
    var init = function() {
        lastCastData = [];
    
        ignoreFastCast = false;
        // fastCast object is not found in any SCI games prior SCI1
        if (getSciVersion() <= SciVersion.SCI_VERSION_01)
            ignoreFastCast = true;
        // Also if fastCast object exists at gamestartup, we can assume that the interpreter doesnt do kAnimate aborts
        //  (found in Larry 1)
        if (getSciVersion() > SciVersion.SCI_VERSION_0_EARLY) {
            if (SegManager.findObjectByName("fastCast").isNull())
                ignoreFastCast = true;
        }    
    }

    var disposeLastCast = function() {
        lasCastData = [];
    }
    
    var invoke = function(list, args) {
        var curAddress = list.first;
        var curNode = SegManager.lookupNode(curAddress);
        var curObject;
        var signal = 0;
    
        while (curNode != null) {
            curObject = curNode.value;
    
            // TODO
            /*if (!ignoreFastCast) {
                // Check if the game has a fastCast object set
                //  if we don't abort kAnimate processing, at least in kq5 there will be animation cels drawn into speech boxes.
                if (!_s->variables[VAR_GLOBAL][84].isNull()) {
                    if (!strcmp(_s->_segMan->getObjectName(_s->variables[VAR_GLOBAL][84]), "fastCast"))
                        return false;
                }
            }*/
    
            signal = readSelectorValue(curObject, SelectorCache.signal);
            if (!(signal & ViewSignals.Frozen)) {
                // Call .doit method of that object
                //Debug.warn("Not sure how to do this yet..");
                
                var argv = 	VM.state.xs.sp + 1;
                invokeSelector(curObject, SelectorCache.doit, args.length, argv, []);
    
                // If a game is being loaded, stop processing
                //if (_s->abortScriptProcessing != kAbortNone)
                  //  return true; // Stop processing
    
                // Lookup node again, since the nodetable it was in may have been reallocated.
                // The node might have been deallocated at this point (e.g. LSL2, room 42),
                // in which case the node reference will be null and the loop will stop below.
                // If the node is deleted from kDeleteKey, it won't have a successor node, thus
                // list processing will stop here (which is what SSCI does).
                curNode = SegManager.lookupNode(curAddress, false);
            }
    
            if (curNode != null) {
                curAddress = curNode.succ;
                curNode = SegManager.lookupNode(curAddress);
            }
        }
        return true;
    }
    
    function compareVal(a, b) {
        if(a == b)
            return 0;
        if(a < b)
            return -1;
        else return 1;
    }
    
    function sortHelper(entry1, entry2) {
        if (entry1.y == entry2.y) {
            // if both y and z are the same, use the order we were given originally
            //  this is needed for special cases like iceman room 35
            if (entry1.z == entry2.z)
                return compareVal(entry1.givenOrderNo, entry2.givenOrderNo);
            else
                return compareVal(entry1.z, entry2.z);
        }
        return compareVal(entry1.y, entry2.y);
    }
    
    var makeSortedList = function(list) {
        var curAddress = list.first;
        var curNode = SegManager.lookupNode(curAddress);
        var listNr;
    
        // Clear lists
        animList = [];
        lastCastData = [];
    
        // Fill the list
        for (listNr = 0; curNode != null; listNr++) {
            var listEntry = new AnimateEntry();
            var curObject = curNode.value;
            listEntry.object = curObject;
            listEntry.castHandle = new Reg(0, 0);
    
            // Get data from current object
            listEntry.givenOrderNo = listNr;
            listEntry.viewId = readSelectorValue(curObject, SelectorCache.view);
            listEntry.loopNo = readSelectorValueSigned(curObject, SelectorCache.loop);
            listEntry.celNo = readSelectorValueSigned(curObject, SelectorCache.cel);
            listEntry.paletteNo = readSelectorValueSigned(curObject, SelectorCache.palette);
            listEntry.x = readSelectorValueSigned(curObject, SelectorCache.x);
            listEntry.y = readSelectorValueSigned(curObject, SelectorCache.y);
            listEntry.z = readSelectorValueSigned(curObject, SelectorCache.z);
            listEntry.priority = readSelectorValueSigned(curObject, SelectorCache.priority);
            listEntry.signal = readSelectorValue(curObject, SelectorCache.signal);
            if (getSciVersion() >= SciVersion.SCI_VERSION_1_1) {
                // Cel scaling
                listEntry.scaleSignal = readSelectorValue(curObject, SelectorCache.scaleSignal);
                if (listEntry.scaleSignal & kScaleSignalDoScaling) {
                    listEntry.scaleX = readSelectorValueSigned(curObject, SelectorCache.scaleX);
                    listEntry.scaleY = readSelectorValueSigned(curObject, SelectorCache.scaleY);
                } else {
                    listEntry.scaleX = 128;
                    listEntry.scaleY = 128;
                }
            } else {
                listEntry.scaleSignal = 0;
                listEntry.scaleX = 128;
                listEntry.scaleY = 128;
            }
            // listEntry.celRect is filled in AnimateFill()
            listEntry.showBitsFlag = false;
    
            animList.push(listEntry);
    
            curAddress = curNode.succ;
            curNode = SegManager.lookupNode(curAddress);
        }
    
        // Possible TODO: As noted in the comment in sortHelper we actually
        // require a stable sorting algorithm here. Since Common::sort is not stable
        // at the time of writing this comment, we work around that in our ordering
        // comparator. If that changes in the future or we want to use some
        // stable sorting algorithm here, we should change that.
        // In that case we should test such changes intensively. A good place to test stable sort
        // is iceman, cupboard within the submarine. If sort isn't stable, the cupboard will be
        // half-open, half-closed. Of course that's just one of many special cases.
    
        // Now sort the list according y and z (descending)
        animList.sort(sortHelper);
    }
    
    var applyGlobalScaling = function(entry, view) {
        Debug.warn("applyGlobalScaling STUB");
    }
    
    var adjustInvalidCels = function(view, it) {
        // adjust loop and cel, if any of those is invalid
        //  this seems to be completely crazy code
        //  sierra sci checked signed int16 to be above or equal the counts and reseted to 0 in those cases
        //  later during view processing those are compared unsigned again and then set to maximum count - 1
        //  Games rely on this behavior. For example laura bow 1 has a knight standing around in room 37
        //   which has cel set to 3. This cel does not exist and the actual knight is 0
        //   In kq5 on the other hand during the intro, when the trunk is opened, cel is set to some real
        //   high number, which is negative when considered signed. This actually requires to get fixed to
        //   maximum cel, otherwise the trunk would be closed.
        var viewLoopCount = view.getLoopCount();
        if (it.loopNo >= viewLoopCount) {
            it.loopNo = 0;
            writeSelectorValue(it.object, SelectorCache.loop, it.loopNo);
        } else if (it.loopNo < 0) {
            it.loopNo = viewLoopCount - 1;
            // not setting selector is right, sierra sci didn't do it during view processing as well
        }
        var viewCelCount = view.getCelCount(it.loopNo);
        if (it.celNo >= viewCelCount) {
            it.celNo = 0;
            writeSelectorValue(it.object, SelectorCache.cel, it.celNo);
        } else if (it.celNo < 0) {
            it.celNo = viewCelCount - 1;
        }
    }
    
    var setNsRect = function(view, it) {
        var shouldSetNsRect = true;
    
        // Create rect according to coordinates and given cel
        if ((it.scaleSignal & ViewScaleSignals.DoScaling) != 0) {
            view.getCelScaledRect(it.loopNo, it.celNo, it.x, it.y, it.z, it.scaleX, it.scaleY, it.celRect);
            // when being scaled, only set nsRect, if object will get drawn
            if ((it.signal & ViewSignals.Hidden) && !(it.signal & ViewSignals.AlwaysUpdate))
                shouldSetNsRect = false;
        } else {
            //  This special handling is not included in the other SCI1.1 interpreters and MUST NOT be
            //  checked in those cases, otherwise we will break games (e.g. EcoQuest 2, room 200)
/*            if ((g_sci->getGameId() == GID_HOYLE4) && (it->scaleSignal & kScaleSignalHoyle4SpecialHandling)) {
                it->celRect = g_sci->_gfxCompare->getNSRect(it->object);
                view->getCelSpecialHoyle4Rect(it->loopNo, it->celNo, it->x, it->y, it->z, it->celRect);
                shouldSetNsRect = false;
            } else*/
            {
                view.getCelRect(it.loopNo, it.celNo, it.x, it.y, it.z, it.celRect);
            }
        }
    
        if (shouldSetNsRect) {
        //    g_sci->_gfxCompare->setNSRect(it->object, it->celRect);
        }
    }
    
    var fill = function(old_picNotValid) {
        var view = null;
    
        for (x in animList) {
            var it = animList[x];
            // Get the corresponding view
            view = ResourceManager.loadView(it.viewId);
            if(view == null) {
                throw VM_LOAD_STALL;
                // TODO VM_LOAD_STALL
                return;
            }
    
            adjustInvalidCels(view, it);
            // TODO
            //processViewScaling(view, it);
            setNsRect(view, it);
    
            //warning("%s view %d, loop %d, cel %d, signal %x", _s->_segMan->getObjectName(curObject), it.viewId, it.loopNo, it.celNo, it.signal);
    
            // Calculate current priority according to y-coordinate
            if ((it.signal & ViewSignals.FixedPriority) == 0) {
                it.priority = GfxPorts.kernelCoordinateToPriority(it.y);
                writeSelectorValue(it.object, SelectorCache.priority, it.priority);
            }
    
            if ((it.signal & ViewSignals.NoUpdate) != 0) {
                if (((it.signal & (ViewSignals.ForceUpdate | ViewSignals.ViewUpdated)) != 0)
                    ||   (it.signal & ViewSignals.Hidden  && !(it.signal & ViewSignals.RemoveView))
                    || (!(it.signal & ViewSignals.Hidden) &&   it.signal & ViewSignals.RemoveView)
                    ||   (it.signal & ViewSignals.AlwaysUpdate))
                    old_picNotValid++;
                it.signal &= ~ViewSignals.StopUpdate;
            } else {
                if ((it.signal & ViewSignals.StopUpdate) || (it.signal & ViewSignals.AlwaysUpdate))
                    old_picNotValid++;
                it.signal &= ~ViewSignals.ForceUpdate;
            }
        }
        
        return old_picNotValid;
    }
    
    var update = function() {
       // Debug.warn("update STUB");
    }
    
    function drawCel(view, loopNo, celNo, celRect, priority, paletteNo, scaleX, scaleY) {
		var clipRect = celRect.clone();
		//clipRect.clip(GfxPorts.getPort().rect);
		
		if (clipRect.isEmpty()) // nothing to draw
			return;
	
		var clipRectTranslated = clipRect.clone();
		GfxPorts.offsetRect(clipRectTranslated);
		
//		view.draw(celRect, clipRect, clipRectTranslated, loopNo, celNo, celRect, priority, paletteNo, false);
		view.draw(loopNo, celNo, clipRectTranslated.left, clipRectTranslated.top, priority);
		
		GfxScreen.restorePic(clipRectTranslated, priority + 1);
		
		/*if (scaleX == 128 && scaleY == 128)
			view->draw(celRect, clipRect, clipRectTranslated, loopNo, celNo, priority, paletteNo, false);
		else
			view->drawScaled(celRect, clipRect, clipRectTranslated, loopNo, celNo, priority, scaleX, scaleY);*/
	}
    
    var drawCels = function() {
        var bitsHandle = new Reg(0, 0);
        lastCastData = [];
    
        for (x in animList) {
            var it = animList[x];
            if ((it.signal & (ViewSignals.NoUpdate | ViewSignals.Hidden | ViewSignals.AlwaysUpdate)) == 0) {
                // Save background
               // bitsHandle = _paint16.bitsSave(it.celRect, GFX_SCREEN_MASK_ALL);
                //writeSelector(it.object, SelectorCache.underBits), bitsHandle);
    
                // draw corresponding cel
                //_paint16.drawCel(it.viewId, it.loopNo, it.celNo, it.celRect, it.priority, it.paletteNo, it.scaleX, it.scaleY);
                var view = ResourceManager.loadView(it.viewId);
                if(view != null) {
                	drawCel(view, it.loopNo, it.celNo, it.celRect, it.priority, it.paletteNo, it.scaleX, it.scaleY);
//                    view.draw(it.loopNo, it.celNo, it.celRect, it.priority, it.paletteNo, it.scaleX, it.scaleY);
                }
                
                it.showBitsFlag = true;
    
                if ((it.signal & ViewSignals.RemoveView) != 0)
                    it.signal &= ~ViewSignals.RemoveView;
    
                // Remember that entry in lastCast
                lastCastData.push(it);
            }
        }    
    }
    
    var updateScreen = function(oldPicNotValid) {
        var lsRect = new Rect();
        var workerRect = new Rect();
    
        for (x in animList) {
            var it = animList[x];
            
            if (it.showBitsFlag != 0 || !(it.signal & (ViewSignals.RemoveView | ViewSignals.NoUpdate) ||
                                            (!(it.signal & ViewSignals.RemoveView) && (it.signal & ViewSignals.NoUpdate) && oldPicNotValid))) {
                lsRect.left = readSelectorValueSigned(it.object, SelectorCache.lsLeft);
                lsRect.top = readSelectorValueSigned(it.object, SelectorCache.lsTop);
                lsRect.right = readSelectorValueSigned(it.object, SelectorCache.lsRight);
                lsRect.bottom = readSelectorValueSigned(it.object, SelectorCache.lsBottom);
    
                workerRect = lsRect.clone();
                workerRect.clip(it.celRect);
    
                if (!workerRect.isEmpty()) {
                    workerRect = lsRect.clone();
                    workerRect.extend(it.celRect);
                } else {
                  //  _paint16.bitsShow(lsRect);
                    workerRect = it.celRect;
                }
                writeSelectorValue(it.object, SelectorCache.lsLeft, it.celRect.left);
                writeSelectorValue(it.object, SelectorCache.lsTop, it.celRect.top);
                writeSelectorValue(it.object, SelectorCache.lsRight, it.celRect.right);
                writeSelectorValue(it.object, SelectorCache.lsBottom, it.celRect.bottom);
                // may get used for debugging

        		GfxPorts.offsetRect(workerRect);

                Screen.updateRect(workerRect);                
                //_paint16.frameRect(workerRect);
                //_paint16.bitsShow(workerRect);
    
                if (it.signal & ViewSignals.Hidden)
                    it.signal |= ViewSignals.RemoveView;
            }
        }    
    }
    
    var restoreAndDelete = function(args) {
        // This has to be done in a separate loop. At least in sq1 some .dispose
        // modifies FIXEDLOOP flag in signal for another object. In that case we
        // would overwrite the new signal with our version of the old signal.
        for (it in animList) {
            // Finally update signal
            writeSelectorValue(animList[it].object, SelectorCache.signal, animList[it].signal);
        }
    
        for (x = animList.length - 1; x >= 0; x--) {
            var it = animList[x];
            // We read out signal here again, this is not by accident but to ensure
            // that we got an up-to-date signal
            it.signal = readSelectorValue(it.object, SelectorCache.signal);
    
            if ((it.signal & (ViewSignals.NoUpdate | ViewSignals.RemoveView)) == 0) {
                var rect = it.celRect.clone();
                GfxPorts.offsetRect(rect);
                GfxScreen.restorePic(rect);
                // Not sure about this one TODO
                //_paint16->bitsRestore(readSelector(_s->_segMan, it.object, SELECTOR(underBits)));
                //writeSelectorValue(_s->_segMan, it.object, SELECTOR(underBits), 0);
            }
    
            if ((it.signal & ViewSignals.DisposeMe) != 0) {
                // Call .delete_ method of that object
                var argv = VM.state.xs.sp + 1;
                invokeSelector(it.object, SelectorCache.delete_, args.length, argv, []);
            }
        }
    }
    
    var reAnimate = function(rect) {
        Debug.warn("reAnimate STUB");
    }
    
    var addToPicDrawCels = function() {
        Debug.warn("addToPicDrawCels STUB");
    }
    
	var addToPicDrawView = function(viewId, loopNo, celNo, leftPos, topPos, priority, control) {
        Debug.warn("addToPicDrawView STUB");
	}
	
	var throttleSpeed = function() {
	    // TODO
    }
    
    var animateShowPic = function() {
//        Debug.warn("STUB");
    }
	
	var kernelAnimate = function(listReference, cycle, args) {
        var old_picNotValid = GfxScreen.picNotValid;
	
        if (listReference.isNull()) {
            disposeLastCast();
            if (GfxScreen.picNotValid)
                animateShowPic();
            return;
        }
    
        var list = SegManager.lookupList(listReference);
        if (list == null)
            Debug.error("kAnimate called with non-list as parameter");
    
        if (cycle != 0) {
            if (!invoke(list, args))
                return;
    
            // Look up the list again, as it may have been modified
            list = SegManager.lookupList(listReference);
        }
    
        var oldPort = GfxPorts.setPort(GfxPorts.picWind());
        disposeLastCast();
    
        makeSortedList(list);
        old_picNotValid = fill(old_picNotValid);
    
        if (old_picNotValid) {
            // beginUpdate()/endUpdate() were introduced SCI1.
            // Calling those for SCI0 will work most of the time but breaks minor
            // stuff like percentage bar of qfg1ega at the character skill screen.
            if (getSciVersion() >= SciVersion.SCI_VERSION_1_EGA_ONLY) {
                GfxPorts.beginUpdate(GfxPorts.picWind());
            }
            update();
            if (getSciVersion() >= SciVersion.SCI_VERSION_1_EGA_ONLY) {
                GfxPorts.endUpdate(GfxPorts.picWind());
            }
        }
    
        GfxScreen.clearViews();
        drawCels();
    
        if (GfxScreen.picNotValid)
            animateShowPic();
            
    
        updateScreen(old_picNotValid);
        restoreAndDelete(args);
            
        // We update the screen here as well, some scenes like EQ1 credits run w/o calling kGetEvent thus we wouldn't update
        //  screen at all
        // TODO
        //g_sci->getEventManager()->updateScreen();
    
        // TODO
        GfxPorts.setPort(oldPort);
    
        // Now trigger speed throttler
        throttleSpeed();
	    
	}
	
	var kernelAddToPicList = function(listReference, args) {
        Debug.warn("kernelAddToPicList STUB");
	}
	
	var kernelAddToPicView = function(viewId, loopNo, celNo, leftPos, topPos, priority, control) {
        Debug.warn("kernelAddToPicView STUB");
	}

    return {
        init : init,
        disposeLastCast : disposeLastCast,
        invoke : invoke,
        makeSortedList : makeSortedList,
        applyGlobalScaling : applyGlobalScaling,
        fill : fill,
        update : update,
        drawCels : drawCels,
        updateScreen : updateScreen,
        restoreAndDelete : restoreAndDelete,
        reAnimate : reAnimate,
        addToPicDrawCels : addToPicDrawCels,
        addToPicDrawView : addToPicDrawView,
        kernelAnimate : kernelAnimate,
        kernelAddToPicList : kernelAddToPicList,
        kernelAddToPicView : kernelAddToPicView
    };
})();
var EGApalette = [
    [0x000,  0x000,  0x000],
    [0x000,  0x000,  0x0AA],
	[0x000,  0x0AA,  0x000],
	[0x000,  0x0AA,  0x0AA],
	[0x0AA,  0x000,  0x000],
	[0x0AA,  0x000,  0x0AA],
	[0x0AA,  0x055,  0x000],
	[0x0AA,  0x0AA,  0x0AA],
	[0x055,  0x055,  0x055],
	[0x055,  0x055,  0x0FF],
	[0x055,  0x0FF,  0x055],
	[0x055,  0x0FF,  0x0FF],
	[0x0FF,  0x055,  0x055],
	[0x0FF,  0x055,  0x0FF],
	[0x0FF,  0x0FF,  0x055],
	[0x0FF,  0x0FF,  0x0FF]   
];

var GfxScreen = (function() {
    var picLayers = [];
//    var viewLayers = [];
    var controlLayer;
    var priorityLayer;
    var picLayer;
    
    var createLayer = function() {
        var canvas = document.createElement("canvas");
        canvas.width = "320";
        canvas.height = "200";
        
        var context = canvas.getContext("2d");
        context.clearRect(0, 0, 320, 200);
        
        return { 
            image : canvas,
            context : context
        };
    }
    
    var init = function() {
        controlLayer = createLayer();
        priorityLayer = createLayer();
        picLayer = createLayer();
    }
    
    var getLayer = function(array, priority) {
        if(typeof array[priority] == 'undefined') {
            array[priority] = createLayer();
        }
        
        return array[priority];
    }
    
    var getPicLayer = function(priority) {
        return getLayer(picLayers, priority);
    }

    var getViewLayer = function(priority) {
        //return getLayer(viewLayers, priority);
    }

    var drawPic = function(picImage) {
        for(var x = 0; x<16; x++) {
            getPicLayer(x).context.clearRect(0, 0, 320, 200);
            getPicLayer(x).context.drawImage(picImage, x * 320, 0, 320, 200, 0, 0, 320, 200);
            picLayer.context.drawImage(picImage, x * 320, 0, 320, 200, 0, 0, 320, 200);
        }
        
        controlLayer.context.drawImage(picImage, 16 * 320, 0, 320, 200, 0, 0, 320, 200);
        Screen.getContext().drawImage(picLayer.image, 0, 0);
        Screen.updateRect(new Rect(0, 0, 320, 200));
    }
    
    var restorePic = function(rect, priority) {
        var clipped = rect.clone();
        clipped.clip(new Rect(0, 0, 320, 200));
        
        if(clipped.width() <= 0 || clipped.height() <= 0)
            return;
    
        if(typeof priority == 'undefined') {
            Screen.getContext().drawImage(picLayer.image, clipped.left, clipped.top, 
                                clipped.width(), clipped.height(), clipped.left, clipped.top,
                                clipped.width(), clipped.height());
        }
        else {
            while(priority < picLayers.length) {
                Screen.getContext().drawImage(getPicLayer(priority).image, clipped.left, clipped.top, 
                                clipped.width(), clipped.height(), clipped.left, clipped.top,
                                clipped.width(), clipped.height());
            
                priority ++;
            }
        }
    }
    
    var render = function() {
        /*var screenContext = Screen.getContext();
        
        for(var x = 0; x<16; x++) {
            screenContext.drawImage(getPicLayer(x).image, 0, 0);    
            screenContext.drawImage(getViewLayer(x).image, 0, 0);    
        }*/
    }
    
    var clearViews = function() {
        /*for(var x in viewLayers) {
            viewLayers[x].context.clearRect(0, 0, 320, 200);
        }*/
    }
    
    function getPixel(canvas, x, y) {
        var data = canvas.getImageData(x, y, 1, 1).data;
        return new Color([data[0], data[1], data[2]]);
    }
    
    function getPixelValue(canvas, x, y) {
        var data = canvas.getImageData(x, y, 1, 1).data;
        
        for(var x = 0; x<EGApalette.length; x++) {
            if(data[0] == EGApalette[x][0]
            && data[1] == EGApalette[x][1]
            && data[2] == EGApalette[x][2])
                return x;
        }
        
        Debug.error("Invalid pixel value!");
        return 0;
    }
    
    function getPriority(x, y) {
        return 0;
    }
    
    function getControl(x, y) {
        return getPixelValue(controlLayer.context, x, y);
    }

    return {
        init : init,
        drawPic : drawPic,
        clearViews : clearViews,
        getPicLayer : getPicLayer,
        getViewLayer : getViewLayer,
        render : render,
        picNotValid : true,
        getPriority : getPriority,
        getControl : getControl,
        restorePic : restorePic
    };
})();
var Engine = (function() {

    var internalTicker = 0;
    var startTime = 0;
    var gameObjectAddress = new Reg(0, 3540);
    
    function initStackBaseWithSelector(selector) {
        VM.state.stack[VM.state.stackBase] = new Reg(0, selector);
        VM.state.stack[VM.state.stackBase + 1] = new Reg(0, 0); // NULL_REG;
    
        // Register the first element on the execution stack
        if (sendSelector(gameObjectAddress, gameObjectAddress, VM.state.stackBase, 2, VM.state.stackBase) == null) {
            Debug.error("initStackBaseWithSelector: error while registering the first selector in the call stack");
        }
        
    }
    
    // Should really be in VMState
    var initGlobals = function() {
        var script_000 = SegManager.getScriptFromSegment(1);
    
        if (script_000.localsCount == 0)
            Debug.error("Script 0 has no locals block");
    
        VM.state.variablesSegment[VariableTypes.VAR_GLOBAL] = script_000.getLocalsSegment();
        VM.state.variablesBase[VariableTypes.VAR_GLOBAL] = script_000.getLocalsBegin();
        VM.state.variables[VariableTypes.VAR_GLOBAL] = script_000.getLocalsBegin();
        VM.state.variablesMax[VariableTypes.VAR_GLOBAL] = script_000.localsCount;
    }
    
    var init = function() {
        internalTicker = 0;
        startTime = new Date().getTime();
        
        Screen.init();
        Input.init();
        Kernel.init();
        VM.init();
        SegManager.init();
        GfxScreen.init();
        GfxAnimate.init();
        GfxPorts.init();
        GfxText.init();
        loadSelectorNames();
        
        FileLoader.onLoadingFinished.addOnce(function() {
            ResourceManager.loadScript(0); 

            FileLoader.onLoadingFinished.addOnce(function() {
                initGlobals();
                SegManager.initSysStrings();
                gameObjectAddress = findGameObject(true);
                initStackBaseWithSelector(SelectorCache.play);
                VM.run();
            });
        });
    }
    
    var update = function() {
        if(FileLoader.finishedLoading() == true) {
            VM.update();
            internalTicker ++;
        }
        
        GfxScreen.render();
        Screen.render();
    }
    
    var getTimeMS = function() {
        //return parseInt(internalTicker * 1000 / 60);
        return (new Date().getTime()) - startTime;
    }
    
    var getTicks = function() {
//        return parseInt(((new Date().getTime()) - startTime) * 1000 / 1000);
        return parseInt(((new Date().getTime()) - startTime) * 60 / 1000);
//        return internalTicker;
    }
    
    return {
        init : init,
        update : update,
        
        getTicks : getTicks,
        getTimeMS : getTimeMS
    };
})();

function findGameObject(addSci11ScriptOffset) {
    var script = SegManager.getSegment(SegManager.getScriptSegment(0), SegmentType.SEG_TYPE_SCRIPT);
    
	if (script == null)
		return NULL_REG.clone();

	var offsetPtr = 0;

	if (getSciVersion() <= SciVersion.SCI_VERSION_1_LATE) {
	    var exportAddr = script.getExportAddress(0);

		return new Reg(script.segmentId, exportAddr);
	} 
	
	return null;
	/*else if (getSciVersion() >= SCI_VERSION_1_1 && getSciVersion() <= SCI_VERSION_2_1) {
		offsetPtr = script->data + 4 + 2 + 2;

		// In SCI1.1 - SCI2.1, the heap is appended at the end of the script,
		// so adjust the offset accordingly if requested
		int16 offset = !isSci11Mac() ? READ_LE_UINT16(offsetPtr) : READ_BE_UINT16(offsetPtr);
		if (addSci11ScriptOffset) {
			offset += script->size;

			// Ensure that the start of the heap is word-aligned - same as in Script::init()
			if (script->size & 2)
				offset++;
		}

		return make_reg(1, offset);
	} else {
		return make_reg(1, relocateOffsetSci3(script->data, 22));
	}*/
}

var RefTest = {
    arr : [ 
        { x : 5, y : 6 },
        { x : 10, y : 2 }
    ],
    ptr : 0
};

var WebSCI = (function() {
    // Private members
    var frameRate = 60;
    
    var update = function() {
        if(FileLoader.finishedLoading()) {
            Engine.update();
        }
    };
        
    return {
        // Public members
        init : function() {
            setInterval(update, 1000 / frameRate);

            Engine.init();
            
            var canvasElement = document.getElementById("canvas");
            canvasElement.style.cursor = "none";
        },
    };

})();



