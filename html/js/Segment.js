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

