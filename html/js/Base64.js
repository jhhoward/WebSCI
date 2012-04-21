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
