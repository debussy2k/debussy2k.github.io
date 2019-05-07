/* 15.5.26.
	seglayer_test.js에서 꼭 필요한 부분만 정리한 코드 임.
*/

// IE에서의 localStorage을 위함.
// IE에서는 페이지를 file://로 띄운 경우 localStorage를 access하는 것만으로도 에러 발생(permission denied)
var kayakLocalStorage = null;
try {
    if (localStorage == undefined) {
        kayakLocalStorage = {
            getItem: function(s) {return null;}, 
            setItem: function(s, val) {}
        }    
    }
    else 
        kayakLocalStorage = localStorage;
} catch(e) {
    kayakLocalStorage = {
        getItem: function(s) {return null;}, 
        setItem: function(s, val) {}
    }
}

var app = angular.module('kayak', []);


function testCtrl($scope) {
    $scope.textInput = '\n'; // textarea의 ng-model
    $scope.inspector = {
        line_staining: false,
        show_outline: false,
        show_metric_box: false,
        show_mirror_content: false,
        show_svg_snapshot: true
    }
    $scope.style = {
        font_family_name: '',
        type_style_name: '',
        bold: false,
        findent: 0,
        lindent: 10,
        fit_to_content_height: true,
        legacy_181028 : false
    }
    $scope.kayak_json_text = '';
    $scope.indesign_json_text = '';
    $scope.show_debug_table = true;
    $scope.check_memorize_selection = kayakLocalStorage.getItem("check_memorize_selection") == 'true' ? true : false;
    $scope.check_svg_color_override = false;
    
    $scope.passive_text = ''
    $scope.check_passive_mode = kayakLocalStorage.getItem("check_passive_mode") == 'true' ? true : false;
    
    $scope.fontlist_text = ''
    $scope.check_fontlist_mode = kayakLocalStorage.getItem("check_fontlist_mode") == 'true' ? true : false;

    var lbutton_down = false;
    var mouse_moved = false;
    var first_move = true;
    var tb = null;
    var is_first_input_in_passive_mode = true;


    function init() {
        if ($scope.check_memorize_selection) {
            switch(kayakLocalStorage.getItem("kayak_test_target")) {
                case 'textonpath':
                    $scope.setup_textonpath();
                    break;
                case 'textbox':
                default:
                    $scope.setup_textbox();
            }
        }
        else {
            $scope.setup_textbox();
        }
    }


    $scope.on_check_memorize_selection = function(event) {
        $scope.check_memorize_selection;
        kayakLocalStorage.setItem("check_memorize_selection", $scope.check_memorize_selection)
    }

    $scope.on_check_svg_color_override = function(event) {
        $scope.check_svg_color_override = !$scope.check_svg_color_override;
        update_svg_snapshot_view();
    }

    $scope.on_check_passive_mode = function(event) {
        // $scope.check_passive_mode = !$scope.check_passive_mode;
        kayakLocalStorage.setItem("check_passive_mode", $scope.check_passive_mode)        
    }

    $scope.on_check_fontlist_mode = function(event) {
        // $scope.check_fontlist_mode = !$scope.check_fontlist_mode;
        kayakLocalStorage.setItem("check_fontlist_mode", $scope.check_fontlist_mode)        
    }

    $scope.setup_textbox = function() {
        if ($scope.check_memorize_selection) {
            kayakLocalStorage.setItem("kayak_test_target", "textbox");
        }
        if (tb != null)
            return;

        // 기본 textbox 테스트용 
        tb = test_for_textbox();
        // tb.unit_test();

        tb.set_focus();
        tb.show_gutter(true);
        start_up();
    }
    $scope.setup_textonpath = function() {
        if ($scope.check_memorize_selection) {
            kayakLocalStorage.setItem("kayak_test_target", "textonpath");
        }
        if (tb != null)
            return;

        // text on path 테스트용
        // let svg_path_data = 'M 50 150 C 150 80, 200 80, 250 150 C 300 230, 400 230, 450 150 L 550 130';
        //let svg_path_data = 'M100, 200 C 45, 200, 0, 155, 0, 100 C 0, 45, 45, 0, 100, 0 C 155, 0, 200, 45, 200, 100 C 200, 155, 155, 200, 100, 200 Z' // cw
        let svg_path_data = 'M100, 200 C 155, 200, 200, 155, 200, 100 C 200, 45, 155, 0, 100, 0 C 45, 0, 0, 45, 0, 100 C 0, 155, 45, 200, 100, 200 Z'   // ccw
        
        tb = test_for_textonpath(svg_path_data);
        $('#textbox_one').css({
            height: '200px',
            margin: '30px'
        });

        tb.set_focus();
        tb.show_gutter(true);
        start_up();
    }


    function start_up() {
        setup_context();
        setup_ui();
        update_editor_ui_value(0);

        tb.add_doc_change_listener(function(change_data) {
            if ($scope.check_passive_mode)
                handle_passive_mode(change_data);

            $scope.ctx.cmd_step = tb.get_history_stack_pointer();

            // console.log('tb.set_doc_change_listen() called');
            if ($scope.inspector.show_mirror_content) {
                tb.mirror({
                    node: document.getElementById("mirror-one"),
                    scale: 0.7
                });
            }
            if ($scope.inspector.show_svg_snapshot) {
                setTimeout(() => {
                    update_svg_snapshot_view();
                }, 1)
            }

            display_info();
            setTimeout(function(){ $scope.$apply(); });
            // $scope.$apply();
        });
        tb.set_user_style_listener(function(tbcursor) {
            // style정보는 실제 커서가 위치한 곳의 직전 char임.
            var cursor = tbcursor.cursor;
            // var cursor = tbcursor.cursor > 0 ? tbcursor.cursor-1 : 0;
            update_editor_ui_value(cursor);

            setTimeout(function() {
                $scope.$apply();
            },1)

        })
        tb.set_user_focus_listener(function() {
            // console.log('set_user_focus_listener() called');
        })
        tb.set_client_size_listener(function(dimension) {
                // console.log('dim: ', dimension);
            })
            // console.log("initial dim: ", tb.get_dimension());

        tb.set_keyboard_event_filter(function(event) {
            var ch = event.keyCode;

            if (ch == 90 && event.ctrlKey) { // ctrl + z
                event.preventDefault();
                console.log("ctrl + z event filtered")
                return false; // true를 리턴하면 내부작업을 건너 뜀.
            } else if (ch == 89 && event.ctrlKey) { // ctrl + y
                event.preventDefault();
                console.log("ctrl + y event filtered")
                return false; // true를 리턴하면 내부작업을 건너 뜀.
            }

            return false;
        })
    }

    handle_passive_mode = function(change_data) {
        // console.log(change_data)
		// (1)size가 변경되는 경우는 무시함.
		if (change_data.cmd == 'resizeBox')
			return;

		/*	doc의 변화가 발생하였으나, edit action의 기원이 외부(즉, passive mode)인 경우 
			다시 외부로 변화를 전파하지 않도록 한다.
		*/
		if (change_data.user_data && change_data.user_data.passive_mode == true) {
			return;
        }
        
        if (is_first_input_in_passive_mode == false) {
            let raw_text = tb.text_core.toRawString()
            $scope.passive_text = raw_text;
        }
        is_first_input_in_passive_mode = false;
    }
    $scope.on_textarea_changed = function() {
        test_passive_mode(tb, $scope.passive_text); // TestPassiveMode.js
    }


    /*  mouse event
        mousedown/move/up은 textbox와 같은 영역에서 발생한 것을 처리함.
        단, textbox가 focus상태이면 textbox가 이벤트를 처리하고 stopPropagation함.
        그렇지 않은 경우은 아래에서 처리하여 select나 focus 상태로 변경됨.
        
        textbox 이외의 영역을 click하면 반드시 tb.set_blur()를 호출해 주어야 함.
        아래 clicked()는 textbox 바깥 영역을 클릭한 것을 테스트 하는 것임.
    */
    $scope.mousedown = function(e) {
        // console.log('event --> mousedown');
        lbutton_down = true;
        lbutton_down_pos = {x:e.offsetX, y:e.offsetY};
        mouse_moved = false;
        first_move = true;
    }
    $scope.mousemove = function(e) {
        if (lbutton_down && first_move == false) {
            // console.log('event --> mousemove');
            mouse_moved = true;
        }


        if (lbutton_down)
            first_move = false;
    }
    $scope.mouseup = function(e) {
        // console.log('event --> mouseup');

        if (lbutton_down) {
            if (mouse_moved) {
                tb.set_select();
            } else // 움직임 없이 click만 한 경우 
                tb.set_focus(e);
        }
        lbutton_down = false;

        display_info(tb.tbcursor.cursor);
        display_cursor_info(tb.tbcursor.cursor);
    }
    $scope.on_set_blur = function(e) {
        tb.set_blur();

        display_info(tb.tbcursor.cursor);
        display_cursor_info(tb.tbcursor.cursor);
    }
    $scope.on_set_select = function(e) {
        tb.set_select();

        display_info(tb.tbcursor.cursor);
        display_cursor_info(tb.tbcursor.cursor);
    }

    $scope.attach_tb = function() {
        tb.attachTo(document.getElementById("textbox_one"));
    }
    $scope.detach_tb = function() {
        tb.detach();
    }

    $scope.show_mirror = function() {
    }

    $scope.loadFromJson = function() {
        var json_str = localStorage['saved_json'];

        // tb가 textbox모드로 생성되었다면, json_str에 text_on_path정보가 있어도 무시하도록 함.
        ignore_text_on_path = tb.text_on_path ? false : true;

        let opt = { 
            remove_textonpath_if_already_exist:true,
            ignore_text_on_path: ignore_text_on_path
        }
        tb.loadFromJson(json_str, opt).then(function() {
            update_editor_ui_value();
        }).catch(function(err) {
            alert(err);
        }) ;
        $scope.ctx.cmd_step = -1;
    }


    $scope.saveAsJson = function() {
        var obj = tb.saveAsJson();
        var json_str = JSON.stringify(obj);
        localStorage.setItem('saved_json', json_str);

        // var new_obj = JSON.parse(json_str);
        // console.log(obj);
    }
    $scope.showJson = function() {
        var obj = tb.saveAsJson();
        var json_str = JSON.stringify(obj, null, 4);
        // console.log(obj);
        console.log(json_str);
    }


    function update_svg_snapshot_view() {
        let opt = null;
        if ($scope.check_svg_color_override) {
            opt = {
                override_fill_color : {
                    fill: '#00ffff',
                    fill_cmyk: '0,0,0,0',
                    transparent_by_src_color : ['#000000', 'black']
                }
            }
        }
        var svg_str = tb.snapshotAsSVG(opt);
        update_dom_with_svg_snapshot(svg_str);    
    }
    function update_dom_with_svg_snapshot(svg_str) {
        if ($scope.inspector.show_svg_snapshot && $('#svg-one').length > 0) {
            $('#svg-one').empty();
            $('#svg-one').append(svg_str);
            if ($('#svg-one svg').length > 0)
                $('#svg-one svg')[0].style.outline = '1px solid lightgray';
        }
    }



    $scope.showUsedFonts = function() {
        // var fonts = tb.gather_used_fonts();
        var font_infos = tb.gather_used_font_list_info();
        console.log(font_infos)
    }
    $scope.showUsedColors = function() {
        var json_str = localStorage['saved_json'];
        
        var obj = tb.inout.gather_used_colors(json_str);
        // var obj = tb.inout.gather_used_colors();
        console.log(obj);
    }

    $scope.import_kayak_json = function() {
        tb.loadFromJson($scope.kayak_json_text).catch(function(err) {
            alert(err);
        }) ;
        $scope.ctx.cmd_step = -1;
    }


    $scope.import_indesign_json = function() {
        // console.log($scope.indesign_json_text);
        var font_list = null;
        if ($scope.check_fontlist_mode) {
            let tmp = JSON.parse($scope.fontlist_text);
            if (tmp && tmp.font_list)
                font_list = tmp.font_list;
        }

        var kayak_obj = tb.importFromInDesignJson($scope.indesign_json_text, font_list);
        if (kayak_obj.kayak_json.fonts_unresolved) {
            console.log(kayak_obj.kayak_json)
            alert('unresolved fonts found. see inspector')
        }
        if (kayak_obj.font_family_remap_occurred) {
            console.log(kayak_obj.kayak_json)
            alert('font-family remap occurred. see inspector')
        }

        tb.loadFromJson(JSON.stringify(kayak_obj.kayak_json));
        $scope.ctx.cmd_step = -1;

        var opt = {
            content : {
                width: kayak_obj.dim_px.width
            },
            page: {
                width: kayak_obj.dim_px.width
            }
        }
        tb.resizeBox(opt);        
    }
    
    $scope.load_indesign_josn_from_LocalStorage = function() {
        var json_str = localStorage['saved_indesign_json'];
        $scope.indesign_json_text = json_str;
    }
    $scope.save_indesign_josn_to_LocalStorage = function() {
        localStorage.setItem('saved_indesign_json', $scope.indesign_json_text);
    }


    $scope.load_fontlist_josn_from_LocalStorage = function() {
        var json_str = localStorage['saved_fontlist_json'];
        $scope.fontlist_text = json_str;
    }
    $scope.save_fontlist_josn_to_LocalStorage = function() {
        localStorage.setItem('saved_fontlist_json', $scope.fontlist_text);
    }

    $scope.resizeBox = function(val) {
        target_width = tb.tbconfig.content.width + val;
        var opt = {
            content: {
                width: tb.tbconfig.content.width + val
            },
            page: {
                width: tb.tbconfig.page.width + val
            }
        }
        tb.resizeBox(opt);
    }

    function update_editor_ui_value(cursor_pos) {
        var sel = tb.tbcursor.sel();
        var sampling_pos = (sel.exists_range) ? sel.end : cursor_pos;

        var cur_style = tb.get_style_info(sampling_pos);
        // console.log('cursor:', cursor,  'bold: ', cur_style.bold, "fsize:", cur_style.FontSize);

        $scope.style.font_family_name = cur_style.familyName;
        // font family에 따른 font type style의 dropdown list 항목을 채운다.
        $scope.type_style_name_list = tb.fontloader.get_font_style_list($scope.style.font_family_name);        
        $scope.style.type_style_name = cur_style.typeStyle;


        $scope.style.font_size = cur_style.FontSize;
        $scope.style.bold = cur_style.bold;
        $scope.style.align = cur_style.align;
        $scope.style.findent = cur_style.findent;
        $scope.style.lindent = cur_style.lindent;
        $scope.style.rindent = cur_style.rindent;
        $scope.style.space_before = cur_style.space_before;
        $scope.style.space_after = cur_style.space_after;
        $scope.style.line_space = cur_style.line_space;
        $scope.style.leading = cur_style.leading;
        
        $scope.style.letter_space = cur_style.letter_space;
        $scope.style.letter_scale_x = cur_style.letter_scale_x;

        $scope.style.legacy_181028 = (tb.version == 'legacy_181028');
        $scope.style.fit_to_content_height = tb.tbpreference.fit_to_content_height;
        $scope.style.vertical_justification = tb.tbpreference.vertical_justification;
        $scope.style.first_line_baseline_offset = tb.tbpreference.first_line_baseline_offset;
    
        if (cur_style.text_on_path) {
            $scope.align_to_path = cur_style.text_on_path.align_to_path;
            $scope.flip_path = cur_style.text_on_path.flip_path;
        }

        M1TextBox.MeasureDiv.Instance().show($scope.inspector.show_metric_box); // #kayak_metric_box를 show/hide함.

        display_info(cursor_pos);
        display_cursor_info(cursor_pos);
    }

    $scope.on_toggle_outline = function() {
        $scope.inspector.show_outline = !$scope.inspector.show_outline;
        if ($scope.inspector.show_outline)
            tb.tbconfig.element.classList.add('show-for-inspection');
        else
            tb.tbconfig.element.classList.remove('show-for-inspection');

        tb.set_focus();
    }

    $scope.on_toggle_line_staining = function() {
        $scope.inspector.line_staining = !$scope.inspector.line_staining;
        var bg_color = $scope.inspector.line_staining ? 'lightgray' : 'transparent';
        $('.kayak-line').css({
            'background-color': bg_color
        });
        tb.set_focus();
    }

    $scope.on_toggle_metric_box = function() {
        $scope.inspector.show_metric_box = !$scope.inspector.show_metric_box;
        M1TextBox.MeasureDiv.Instance().show($scope.inspector.show_metric_box); // #kayak_metric_box를 show/hide함.

        tb.set_focus();
    }

    $scope.on_toggle_mirror_content = function () {
        $scope.inspector.show_mirror_content = !$scope.inspector.show_mirror_content;
        tb.set_focus();
    }

    $scope.on_toggle_svg_snapshot = function () {
        $scope.inspector.show_svg_snapshot = !$scope.inspector.show_svg_snapshot;
        tb.set_focus();

        setTimeout(function() {
            if ($scope.inspector.show_svg_snapshot) {
                var svg_str = tb.snapshotAsSVG({});
                update_dom_with_svg_snapshot(svg_str);
            }    
        }, 1)
    }

    $scope.on_set_render_mode = function(val) {
        tb.setRenderMode(val);
    }

    $scope.on_fit_width_to_first_paragraph = function() {
        tb.fit_width_to_first_paragraph({avoid_shrink:true});
    }

    $scope.on_set_font_family_name = function(font_family_name) {
        console.log(font_family_name)
        $scope.style.font_family_name = font_family_name;

        $scope.type_style_name_list = tb.fontloader.get_font_style_list(font_family_name);
        $scope.style.type_style_name = $scope.type_style_name_list[0].name;
        
        var sel = tb.tbcursor.sel_by_rule();        
        tb.opStyle.set_font_family(font_family_name, $scope.style.type_style_name, sel, on_par_changed);
        tb.set_focus();        
    }
    $scope.on_set_type_style_name = function(type_style_name) {
        console.log(type_style_name)
        $scope.style.type_style_name = type_style_name;

        var sel = tb.tbcursor.sel_by_rule();        
        tb.opStyle.set_font_family($scope.style.font_family_name, type_style_name, sel, on_par_changed);
        tb.set_focus();        
    }

    $scope.on_set_fsize = function(fsize_val) {
        if (fsize_val !== undefined) {
            $scope.style.font_size = fsize_val;
        }

        var fsize = $scope.style.font_size;
        if ($scope.style.font_size > 99)
            fsize = 99;
        else if ($scope.style.font_size < 6)
            fsize = 6;
        var sel = tb.tbcursor.sel_by_rule();
        tb.opStyle.set_font_size(fsize, sel, on_par_changed);
        tb.set_focus();
    }

    $scope.on_set_bold = function() {
        var sel = tb.tbcursor.sel();
        tb.opStyle.set_bold(null, sel, on_par_changed);
        tb.set_focus();
    }

    $scope.on_set_font_color = function(color_val, color_cmyk_val) {
        var sel = tb.tbcursor.sel_by_rule();
        tb.opStyle.set_fontColor(color_val, color_cmyk_val, sel, on_par_changed);
        tb.set_focus();
    }

    // ng-change에서 부른경우 align_code는 undefined이고, 이미 ng-model값이 변경되어 있음.
    $scope.on_set_align = function(align_code) {
        if (align_code)
            $scope.style.align = align_code
        var sel = tb.tbcursor.sel_by_rule();
        tb.opStyle.set_text_align($scope.style.align, sel, on_par_changed);
        tb.set_focus();
    }

    $scope.on_set_findent = function() {
        if ($scope.style.findent === null)
            return;
        var sel = tb.tbcursor.sel_by_rule();
        tb.opStyle.set_par_style('first', $scope.style.findent, sel, on_par_changed);
    }
    $scope.on_set_lindent = function() {
        if ($scope.style.lindent === null)
            return;
        var sel = tb.tbcursor.sel_by_rule();
        tb.opStyle.set_par_style('left', $scope.style.lindent, sel, on_par_changed);
    }
    $scope.on_set_rindent = function() {
        if ($scope.style.rindent === null)
            return;
        var sel = tb.tbcursor.sel_by_rule();
        tb.opStyle.set_par_style('right', $scope.style.rindent, sel, on_par_changed);
    }
    $scope.on_set_space_before = function() {
        if ($scope.style.space_before === null)
            return;
        var sel = tb.tbcursor.sel_by_rule();
        tb.opStyle.set_par_style('space_before', $scope.style.space_before, sel, on_par_changed);
    }
    $scope.on_set_space_after = function() {
        if ($scope.style.space_after === null)
            return;
        var sel = tb.tbcursor.sel_by_rule();
        tb.opStyle.set_par_style('space_after', $scope.style.space_after, sel, on_par_changed);
    }
    $scope.on_set_line_space = function() {
        if ($scope.style.line_space === null)
            return;
        var sel = tb.tbcursor.sel_by_rule();
        tb.opStyle.set_par_style('line_space', $scope.style.line_space, sel, on_par_changed);
    }
    $scope.on_set_leading = function(event) {
        if ($scope.style.leading === null)
            return;
        var sel = tb.tbcursor.sel_by_rule();
        var leading_val = ($scope.style.leading == 'auto') ? 'auto' : parseFloat($scope.style.leading);
        tb.opStyle.set_par_style('leading', leading_val, sel, on_par_changed);
    }

    $scope.on_set_letter_space = function () {
        if ($scope.style.letter_space === null)
            return;
        var sel = tb.tbcursor.sel_by_rule();
        tb.opStyle.set_letter_space($scope.style.letter_space, sel, on_par_changed);
        tb.set_focus();
    }
    $scope.on_set_letter_scale_x = function () {
        if ($scope.style.letter_scale_x == null)
            return;
        var sel = tb.tbcursor.sel_by_rule();
        tb.opStyle.set_letter_scale_x($scope.style.letter_scale_x, sel, on_par_changed);
        tb.set_focus();
    }

    $scope.on_insert_str = function() {
        tb.opEdit.insert_string(tb.tbcursor.cursor, "abc\n123");
        tb.set_focus();
    }
    $scope.on_select_all = function() {
        // tb.tbcursor.sel_all();
        tb.select_all_text();
        tb.set_focus(); 
    }

    $scope.on_get_dimension = function () {
        var dim = tb.get_dimension();
         console.log(dim);
    }

    $scope.toggle_show_table = function() {
        $scope.show_debug_table = !$scope.show_debug_table;
        $('#debug_table').css('display', $scope.show_debug_table ? 'block' : 'none')
    }

    ///////////////////////////////////////////////////////////////////////////////////
    // for private function
    ///////////////////////////////////////////////////////////////////////////////////

    function test_for_textbox() {
        var width = 500;

        var options = {
            schema: false,
            mode: 'box',
            base_node: document.getElementById("textbox_one"),
            page: {
                width: width, // unit:px
                height: 200, // unit:px
                gutter_top: 0,
                gutter_bottom: 0,
                scale: 1
            },
            content: {
                // width: width - 2, // unit:px
                width: width, // unit:px
                default_font_size: 18,
                default_align: 'left',
                default_font_color: {
                    rgb:'black',
                    cmyk: [0, 0, 0, 100]
                }                
            },
            debug: {
                show_linebox : true,    // textline의 경계표시 
                show_textonpath_bbox: true
            },
            masterClipboard: M1TextBox.GT_MasterClipboard.getInstance()
        }
        
        var textbox = new M1TextBox.textbox(options);

        // 폰트 listener의 경우 textbox.init()이전에 등록해야 함. 
        textbox.set_user_font_listener(function(state) {
            console.log('>>>> Simple Textbox font loading listener: ', state);
        })

        textbox.init().then(function() {
            console.log('initialized...');
            textbox.tbconfig.element.style.outline = '8px solid lightgray' // kayak-root
            // textbox.tbconfig.content_elem.outline = '1px solid lightgray'
            textbox.set_focus();
            
        })
        return textbox;
    }

    function test_for_textonpath(svg_path_data) {
        var width = 600;

        var options = {
            schema: false,
            mode: 'box',
            base_node: document.getElementById("textbox_one"),
            page: {
                width: width, // unit:px
                height: 300, // unit:px
                gutter_top: 0,
                gutter_bottom: 0,
                scale: 1
            },
            content: {
                // width: width - 2, // unit:px
                width: width, // unit:px
                default_font_size: 18
            },
            debug: {
                show_linebox : true,    // textline의 경계표시 
                show_textonpath_bbox: true                
            },
            masterClipboard: M1TextBox.GT_MasterClipboard.getInstance(),
            // text_on_path: {
            //     svg_path_data: svg_path_data
            // }            
        }
        
        var textbox = new M1TextBox.textbox(options);
        textbox.init_textonpath({
            svg_path_data: svg_path_data,
            align_to_path: 'baseline',
            flip_path: false
        })

        // 폰트 listener의 경우 textbox.init()이전에 등록해야 함. 
        textbox.set_user_font_listener(function(state) {
            console.log('>>>> Simple Textbox font loading listener: ', state);
        })

        textbox.init().then(function() {
            console.log('initialized...');
            textbox.tbconfig.element.style.outline = '1px dashed gray'
            // textbox.tbconfig.content_elem.outline = '1px solid lightgray'
            textbox.set_focus();
        })
        return textbox; 
    }

    // callback for document changing
    function on_par_changed(err, text_change_info, par_change_info) {
        if (par_change_info == null)
            return;
    }

    // for debugging info
    function setup_context() {
        $scope.ctx = {};
        $scope.ctx.enableInspector = true;
        $scope.ctx.component_selection_state = 0;
        $scope.ctx.cmd_step = -1;
        $scope.ctx.cursor_pos = 0;
        $scope.ctx.sel_range = '';
        $scope.ctx.seg_vec = '';
        $scope.ctx.word_cache_size = 0;
        $scope.ctx.seg_fsize = '';
        $scope.ctx.seg_bold = '';
        $scope.ctx.seg_fontColor = '';
        $scope.ctx.text_core = '';
        $scope.ctx.text_change_info = {};
        $scope.ctx.par_change_info = {};
        $scope.ctx.pars = [];
        $scope.ctx.need_update = false;
    }

    function setup_ui() {
        $scope.font_family_name_list = tb.fontloader.get_family_list('kr');
        $scope.style.font_family_name = $scope.font_family_name_list[0].name;

        $scope.type_style_name_list = tb.fontloader.get_font_style_list($scope.style.font_family_name);
        $scope.style.type_style_name = $scope.type_style_name_list[0].name;
    

        // font size select ui
        $scope.font_size = 10;
        $scope.font_size_list = [
            { value: 9, name: '9' },
            { value: 10, name: '10' },
            { value: 11, name: '11' },
            { value: 12, name: '12' },
            { value: 14, name: '14' },
            { value: 18, name: '18' },
            { value: 24, name: '24' },
            { value: 30, name: '30' },
            { value: 36, name: '36' },
            { value: 48, name: '48' },
            { value: 60, name: '60' },
            { value: 72, name: '72' },
            { value: 96, name: '96' }
        ];
    }



    function display_cursor_info(cursor_pos) {
        var pos_info = tb.layout.get_cursor_pos_info(cursor_pos);

        //$scope.ctx.cursor_pos += ' ' + tbdom.get_cursor_pos_string();
        var str = '[';
        str += 'li_doc:' + pos_info.li_doc + ', pi:' + pos_info.pi + ', li_par:' + pos_info.li_par + ', ci_line:' + pos_info.ci_line;
        str += ']';
        str += ' ' + '[ci_lbegin_doc:' + pos_info.ci_lbegin_doc + ', ci_lend_doc:' + pos_info.ci_lend_doc + ']';

        // CURSOR의 좌표 
        var rng = {
            begin: pos_info.ci_lbegin_doc,
            end: pos_info.ci_doc
        }
        var dim = tb.docFactory.get_textline_dimension(rng);
        str += ' ' + '[char_x: ' + dim.width + ' ,y:n/a]';

        $scope.ctx.cursor_pos = str;
    }

    function display_info(cursor_pos) {
        $scope.ctx.component_selection_state = tb.tbinput.get_sel_state_text();

        var sel = tb.tbcursor.sel();
        var sampling_pos = (sel.exists_range) ? sel.end : cursor_pos;

        var sel_begin = sel.begin;
        var sel_end = sel.end;
        if (sel_begin === sel_end)
            $scope.ctx.sel_range = 'none';
        else
            $scope.ctx.sel_range = '[' + sel_begin + ', ' + sel_end + ']';

        $scope.ctx.word_cache_size = tb.tbcontext.WordCache.size();

        // SegLayer 표시
        var segVec = tb.m_Par._get_vec();
        var str = '[';
        for (var i = 0; i < segVec.length; i++) {
            str += segVec[i].m_nCount;
            str += (i < (segVec.length - 1)) ? ', ' : '';
        }
        str += ']';
        $scope.ctx.seg_vec = str;

        // Font Size
        var segVec = tb.m_FSizeLayer._get_vec();
        var str = '[';
        for (var i = 0; i < segVec.length; i++) {
            str += segVec[i].m_nCount;
            str += (i < (segVec.length - 1)) ? ', ' : '';
        }
        str += ']';
        $scope.ctx.seg_fsize = str;

        // Bold
        var segVec = tb.m_Bold._get_vec();
        var str = '[';
        for (var i = 0; i < segVec.length; i++) {
            str += segVec[i].m_nCount;
            str += (i < (segVec.length - 1)) ? ', ' : '';
        }
        str += ']';
        $scope.ctx.seg_bold = str;

        // Font Color
        var segVec = tb.m_FontColor._get_vec();
        var str = '[';
        for (var i = 0; i < segVec.length; i++) {
            str += segVec[i].m_nCount;
            str += (i < (segVec.length - 1)) ? ', ' : '';
        }
        str += ']';
        $scope.ctx.seg_fontColor = str;

        $scope.ctx.text_core = tb.text_core.toString();
    }

    // for text on path
    ////////////////////////////////////////////////////////////////////////////////////
    $scope.align_to_path_options = ["baseline", "ascender", "descender", "center"];
    $scope.align_to_path = "baseline";
    $scope.flip_path = false;

    $scope.on_change_align_to_path = function() {
        console.log($scope.align_to_path);
        tb.opStyle.set_textonpath_align($scope.align_to_path);
    }
    $scope.on_change_flip_path = function() {
        tb.opStyle.set_textonpath_flip_path($scope.flip_path);
    }
    
    $scope.on_resize_path_bbox = function() {
        tb.text_on_path.set_bbox(400, 150);
        tb.text_on_path.update_view();
    }


    // for vertical textbox align
    ////////////////////////////////////////////////////////////////////////////////////
    $scope.on_toggle_legacy_181028 = function() {
        let doc_ver = (tb.version == 'legacy_181028') ? '1.0.0' : 'legacy_181028';
        tb.tbpreference.set_legacy_181028(doc_ver)

        $scope.style.legacy_181028 = (tb.version == 'legacy_181028'); 
    }

    $scope.on_toggle_fit_to_content_height = function() {
        let fit_to_content_height = !tb.tbpreference.fit_to_content_height;
        tb.opStyle.set_fit_to_content_height(fit_to_content_height);

        $scope.style.fit_to_content_height = fit_to_content_height;
    }
    $scope.on_set_vertical_justification = function() {
        // ng-change에서 부른경우 align_code는 undefined이고, 이미 ng-model값이 변경되어 있음.
        tb.opStyle.set_vertical_align($scope.style.vertical_justification);
    }
    
    $scope.on_set_first_line_baseline_offset_mode = function() {
        // ng-change에서 부른경우 align_code는 undefined이고, 이미 ng-model값이 변경되어 있음.
        tb.tbpreference.set_first_line_baseline_offset_mode($scope.style.first_line_baseline_offset)
    }

    $scope.height_resizer_mousedown = function(e)  {
        e.preventDefault();
        e.stopPropagation();

		let start_pos = {x:e.clientX, y:e.clientY};
        let last_pos = {x:e.clientX, y:e.clientY};
        let org_frame_height = tb.tbpreference.frame_height;


        let mousemove_listener = function(e) {
            last_pos = {x:e.clientX, y:e.clientY};
            // console.log(last_pos, last_pos.y - start_pos.y)

            // let y_delta = last_pos.y - start_pos.y;
            // let new_height = org_frame_height + y_delta;
            // tb.opStyle.set_frame_height(new_height, null, true);

			e.stopPropagation();
        }
        let mouseup_listener = function(e) {
            last_pos = {x:e.clientX, y:e.clientY};
            // console.log(last_pos, last_pos.y - start_pos.y)

            let y_delta = last_pos.y - start_pos.y;
            // var dim = tb.get_dimension();

            let new_height = org_frame_height + y_delta;
            // tb.tbpreference.set_height(new_height)
            tb.opStyle.set_frame_height(new_height);


            document.removeEventListener('mousemove', mousemove_listener);
            document.removeEventListener('mouseup', mouseup_listener);
			e.stopPropagation();
        }

        document.addEventListener('mousemove', mousemove_listener)
        document.addEventListener('mouseup', mouseup_listener)
    }

    init();
}



app.directive('myEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if(event.which === 13) {
                scope.$apply(function (){
                    scope.$eval(attrs.myEnter);
                });

                event.preventDefault();
            }
        });
    };
});