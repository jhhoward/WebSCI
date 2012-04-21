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
