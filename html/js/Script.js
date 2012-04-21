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
