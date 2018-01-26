'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.InvalidStateError = undefined;

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Create a class inheriting from Error.
 */
function createErrorClass(name) {
    var klass = function (_Error) {
        (0, _inherits3.default)(klass, _Error);

        /**
         * Custom error class constructor.
         * @param {string} message
         */
        function klass(message) {
            (0, _classCallCheck3.default)(this, klass);

            // Override `name` property value and make it non enumerable.
            var _this = (0, _possibleConstructorReturn3.default)(this, (klass.__proto__ || (0, _getPrototypeOf2.default)(klass)).call(this, message));

            Object.defineProperty(_this, 'name', { value: name });
            return _this;
        }

        return klass;
    }(Error);

    return klass;
}

var InvalidStateError = exports.InvalidStateError = createErrorClass('InvalidStateError');