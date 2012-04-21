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
    