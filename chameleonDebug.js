;(function($) {
    var _s = {},
        _f = {},
        toggleDebug = function(s) {
            _f.debug = s ? !!s.debug : false;
        },
        logger = function(msg, type) {
            if (_f.debug) {
                type = type || 'log';
            
                var logAction = {
                    'error': function(m) {
                        console.error('Chameleon.js:', m);
                    },
                    'warn': function(m) {
                        console.warn('Chameleon.js:', m);
                    },
                    'log': function(m) {
                        console.log('Chameleon.js:', m);
                    }
                };
            
                if (typeof msg === 'undefined') {
                    logAction.error('Msg given to logger is undefined!');
                } else {
                    if (logAction.hasOwnProperty(type)) {
                        logAction[type](msg);
                    } else {
                        logAction.error(['Unknown logAction type!', type]);
                    }
                }
            }
        },
        isSettingAllowed = function(val, prop) {
            var allowed_values = _s.allowed_values,
                fixValCase = function(allowed_values, val, prop) {
                    var case_fixed_val = false;
                
                    if (allowed_values.hasOwnProperty(prop)) {
                        $.each(allowed_values[prop], function(i, allowed_val) {
                            if (val.toLowerCase() === allowed_val.toLowerCase()) {
                                case_fixed_val = allowed_val;
                                return false;
                            }
                        });
                    }
                
                    return case_fixed_val || val;
                },
                validated_item = {is_allowed: true};
        
            if (allowed_values.hasOwnProperty(prop)) {
                var caseFixedVal = fixValCase(allowed_values, val, prop);
            
                if (caseFixedVal !== val) {
                    validated_item = {
                        is_allowed: true,
                        fixed_val: caseFixedVal,
                        valid: false,
                        msg: 'Setting "' + prop + '" with value "' + val + '" case fixed to "' + caseFixedVal + '".'
                    };
                } else if (allowed_values[prop].indexOf(val) === -1) {
                    validated_item = {
                        is_allowed: false,
                        fixed_val: allowed_values[prop][0],
                        valid: false,
                        msg: 'Not allowed value for "' + prop + '". You can use only: [' + allowed_values[prop].join(', ') + '].'
                    };
                }
            }
        
            return validated_item;
        },
        isSettingEmpty = function(val) {
            var is_empty = false;
        
            if (typeof val === 'string') {
                is_empty = val === '';
            }
        
            return is_empty;
        },
        isSettingCanBeIgnored = function(val, prop) {
            var can_be_ignored = ['source_color'];
        
            return {
                ignore: isSettingEmpty(val) && can_be_ignored.indexOf(prop) !== -1,
                result: function() {
                    logger('isSettingCanBeIgnored - setting "' + prop + '" will be ignored.', 'log');
                
                    return {
                        prop: prop,
                        val: val,
                        fixed_val: val,
                        valid: true,
                        msg: 'Setting "' + prop + '" is ignored.'
                    }
                }
            };
        },
        isColorValid = function (color) {
            return $.fn.chameleon('isColorValid', color);
        }
        validateSettings = function(s, a, es) {
            var invalid = [],
                fixed_settings = s || {},
                val_types = [
                    {
                        type: 'number',
                        msg: function(prop) {
                            return 'Should be a number.' + ' Min: ' + _s.limits[prop].min + ', max: ' + _s.limits[prop].max + '.';
                        },
                        items: ['color_alpha', 'alpha', 'color_difference', 'color_adapt_limit', 'canvas_side']
                    },
                    {
                        type: 'string',
                        msg: function() {
                            return 'Should be a string.';
                        },
                        items: ['content_prefix', 'settings_type', 'sort_colors', 'color_format']
                    },
                    {
                        type: 'color',
                        msg: function() {
                            return 'Should be a color! String: hex (#xxx or #xxxxxx or xxx or xxxxxx) or rgb(x,x,x) or rgba(x,x,x,x). Array ([x, x, x, x]) or object ({"r": x, "g": x, "b": x, "alpha": x}).';
                        },
                        items: ['dummy_back', 'dummy_front', 'color', 'source_color']
                    },
                    {
                        type: 'boolean',
                        msg: function() {
                            return 'Should be a boolean value: true or false.';
                        },
                        items: ['debug', 'async_colorize', 'apply_colors', 'adapt_colors', 'all_colors', 'insert_colors', 'data_colors']
                    },
                    {
                        type: 'array',
                        msg: function() {
                            return 'Should be an array.';
                        },
                        items: []
                    },
                    {
                        type: 'object',
                        msg: function() {
                            return 'Should be an object.';
                        },
                        items: ['$img', 'content', 'rules', 'settings_values']
                    },
                    {
                        type: 'function',
                        msg: function() {
                            return 'Should be a function.';
                        },
                        items: ['afterColorized', 'beforeAsyncColorized', 'afterAsyncColorized', 'onGetColorsSuccess', 'onGetColorsError']
                    }
                ],
                fixColor = function(color) {
                    return $.fn.chameleon('skipValidation')('fixColor', color);
                },
                isColorValid = function(color) {
                    return $.fn.chameleon('skipValidation')('isColorValid', color);
                },
                beforeFix = function(val, prop) {
                    switch (prop) {
                        case 'content_prefix':
                            val = _s.content_prefix;
                        
                            break;
                        default:
                        // Silence
                    }
                
                    return val;
                },
                afterValidation = function(val, prop, validated_item) {
                    if (validated_item.valid) {
                        switch (prop) {
                            case 'content_prefix':
                                var new_val = String(val).replace(/\s+/g, '');
                            
                                if (val !== new_val) {
                                    validated_item.valid = false;
                                    validated_item.fixed_val = new_val;
                                    validated_item.msg =
                                        'afterValidation - value "' + val + '" of "' + prop + '" was fixed! ' +
                                        'New value is "' + new_val + '".'
                                }
                            
                                break;
                            default:
                            // Silence
                        }
                    
                    }
                
                    return validated_item;
                },
                fixVal = function(val, prop, is_valid, fixCB) {
                    if (typeof fixCB === 'function' && !is_valid) {
                        val = fixCB(beforeFix(val, prop));
                    }
                
                    return {
                        valid: is_valid,
                        fixed_val: val
                    };
                },
                validation = {
                    numberValidation: function(val, prop) {
                        val = parseFloat(val);
                    
                        var is_valid = true;
                    
                        if (_s.limits.hasOwnProperty(prop)) {
                            is_valid = !isNaN(val) && _s.limits[prop].min <= val && val <= _s.limits[prop].max;
                        } else {
                            logger('validateSettings/numberValidation - limits for number setting "' + prop + '" are missing!', 'warn');
                        }
                    
                        return fixVal(val, prop, is_valid, function(v) {
                            if (isNaN(v)) {
                                v = _s.limits[prop].min;
                            } else {
                                v = Math.min(Math.max(v, _s.limits[prop].min), _s.limits[prop].max);
                            }
                        
                            return v;
                        });
                    },
                    stringValidation: function(val, prop) {
                        return fixVal(val, prop, typeof val === 'string', function(v) {
                            return String(v);
                        });
                    },
                    colorValidation: function(val, prop) {
                        return fixVal(val, prop, isColorValid(val), fixColor);
                    },
                    booleanValidation: function(val, prop) {
                        return fixVal(val, prop, typeof val === 'boolean', function(v) {
                            return !!v;
                        });
                    },
                    arrayValidation: function(val, prop) {
                        return fixVal(val, prop, Array.isArray(val), function(v) {
                            return [];
                        });
                    },
                    objectValidation: function(val, prop) {
                        return fixVal(val, prop, typeof val === 'object', function(v) {
                            return {};
                        });
                    },
                    functionValidation: function(val, prop) {
                        return fixVal(val, prop, typeof val === 'function', function(v) {
                            return function() {};
                        });
                    }
                },
                checkProps = function(s) {
                    var check = [];
                
                    for (var prop in s) {
                        if (s.hasOwnProperty(prop)) {
                            check.push(checkProp(s[prop], prop));
                        }
                    }
                
                    return check;
                },
                checkProp = function(val, prop) {
                    var type = false,
                        msg = '';
                
                    $.each(val_types, function(index, val_type) {
                        if (val_type.items.indexOf(prop) !== -1) {
                            type = val_type.type;
                            msg = val_type.msg(prop);
                        
                            return false;
                        }
                    });
                
                    if (type) {
                        var ignore_setting = isSettingCanBeIgnored(val, prop);
                    
                        if (ignore_setting.ignore) {
                            return ignore_setting.result();
                        }
                    
                        var validated_item = $.extend(
                            $.extend(validation[type + 'Validation'](val, prop), {msg: msg}),
                            isSettingAllowed(val, prop)
                        );
                    
                        validated_item = afterValidation(val, prop, validated_item);
                    
                        return {
                            prop: prop,
                            val: val,
                            fixed_val: validated_item.fixed_val,
                            valid: validated_item.valid,
                            msg: validated_item.msg
                        };
                    }
                
                    logger('validateSettings - Unknown val_type "' + prop + '".', 'warn');
                
                    return {
                        prop: prop,
                        val: val,
                        fixed_val: val,
                        valid: false,
                        msg: 'Unknown value type "' + prop + '".'
                    };
                },
                isNotValid = function(c) { return !c.valid; };
        
            var check_result;
        
            if (typeof s === 'string') {
                toggleDebug({debug: true});
            
                var checkString = {};
            
                checkString[_s.actions.WRAPCOLOR] = function(s) {
                    var r = false,
                        invalid = !isColorValid(s);
                
                    if (invalid) {
                        var fixed_val = fixColor(s);
                    
                        r = {
                            invalid: {
                                prop: _s.actions.WRAPCOLOR,
                                val: s,
                                fixed_val: fixed_val,
                                valid: false,
                                msg: 'Color should be valid! Invalid color: ' + JSON.stringify(s) + '.'
                            },
                            fixed_settings: fixed_val
                        };
                    }
                
                    return r;
                };
            
                if (checkString.hasOwnProperty(a)) {
                    check_result = checkString[a](s);
                
                    if (check_result) {
                        invalid.push(check_result.invalid);
                        fixed_settings = check_result.fixed_settings;
                    }
                }
            } else if (typeof s === 'number') {
            
            }  else if (Array.isArray(s)) {
                toggleDebug({debug: true});
            
                var checkArray = {};
            
                checkArray[_s.actions.WRAPCOLOR] = function(s) {
                    var r = false,
                        invalid = false,
                        arr_is_color = isColorValid(s);
                
                    if (arr_is_color) {
                        invalid = !arr_is_color;
                    } else {
                        invalid = s.filter(function(c) {
                            var is_valid = false;
                        
                            if (typeof c === 'string') {
                                is_valid = isColorValid(c);
                            } else if (typeof c === 'object') {
                                if (Array.isArray(c)) {
                                    is_valid = isColorValid(c);
                                } else if (typeof c.color !== 'undefined') {
                                    is_valid = isColorValid(c.color);
                                
                                    if (c.source_color) {
                                        is_valid = is_valid && isColorValid(c.source_color);
                                    }
                                }
                            }
                        
                            return !is_valid;
                        });
                    }
                
                    if (invalid && invalid.length) {
                        var fixed_val = s.map(fixColor);
                    
                        r = {
                            invalid: {
                                prop: _s.actions.WRAPCOLOR,
                                val: s,
                                fixed_val: fixed_val,
                                valid: false,
                                msg: 'All colors should be valid! Invalid colors: ' + JSON.stringify(invalid) + '.'
                            },
                            fixed_settings: fixed_val
                        };
                    }
                
                    return r;
                };
            
                if (checkArray.hasOwnProperty(a)) {
                    check_result = checkArray[a](s);
                
                    if (check_result) {
                        invalid.push(check_result.invalid);
                        fixed_settings = check_result.fixed_settings;
                    }
                }
            } else if (typeof s === 'object') {
                toggleDebug(s);
            
                fixed_settings = $.extend({}, s);
                invalid = checkProps(s).filter(isNotValid);
            
                $.each(invalid, function(index, item) {
                    fixed_settings[item.prop] = item.fixed_val;
                });
            }
        
            return {
                invalid: invalid,
                fixed_settings: fixed_settings
            };
        },
        init = function(s) {
            s = s || {};
            
            _s = s._s;
        };
    
    window.chameleonDebug = {
        init: init,
        logger: logger,
        toggleDebug: toggleDebug,
        validateSettings: validateSettings
    };
})(jQuery);