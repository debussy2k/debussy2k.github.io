function test_passive_mode(tb, text, callback) {
    let user_data = {
        passive_mode: true
    }

    let cur_str = tb.text_core.toRawString();
    cur_str = cur_str.substring(0, cur_str.length-1);

    // 받아온 텍스트와 diff를 하여 insert_string() 또는 erase()를 한다.
    // 참고: https://github.com/kpdecker/jsdiff
    let diff = Diff.diffChars(cur_str, text);
    diff.reduce((pos, part) => {
        if (part.added) {
            // tb.opEdit.insert_string(pos, part.value, null, {user_data:user_data}); 
            tb.opEdit.insert_multiline_string(pos, part.value, null, {user_data:user_data}); 
            callback && callback();
            pos += part.count;
        }
        else if (part.removed) {
            tb.opEdit.erase(pos, pos, pos + part.count, null, {user_data:user_data});
            callback && callback();
        }
        else {
            let src_str = tb.text_core.toRawString(pos, pos + part.count);
            part.value;
            if (src_str != part.value)
                console.error('string not match:', src_str, part.value)
            pos += part.count;
        }
        return pos;
    }, 0)

}