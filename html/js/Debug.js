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