"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const constants_1 = require("../constants");
let RestfulQueryInterceptor = class RestfulQueryInterceptor {
    constructor() {
        this.delim = '||';
        this.delimStr = ',';
        this.reservedFields = [
            'fields',
            'filter',
            'filter[]',
            'or',
            'or[]',
            'sort',
            'sort[]',
            'join',
            'join[]',
            'per_page',
            'limit',
            'offset',
            'page',
            'cache',
        ];
    }
    intercept(context, next) {
        const req = context.switchToHttp().getRequest();
        req[constants_1.PARSED_QUERY_REQUEST_KEY] = this.transform(req.query);
        return next.handle();
    }
    transform(query) {
        if (!shared_utils_1.isObject(query) || !Object.keys(query).length) {
            return {};
        }
        const fields = this.splitString(query.fields);
        const filter = this.parseArray(query.filter || query['filter[]'], this.parseFilter);
        const or = this.parseArray(query.or || query['or[]'], this.parseFilter);
        const sort = this.parseArray(query.sort || query['sort[]'], this.parseSort);
        const join = this.parseArray(query.join || query['join[]'], this.parseJoin);
        const limit = this.parseInt(query.per_page || query.limit);
        const offset = this.parseInt(query.offset);
        const page = this.parseInt(query.page);
        const cache = this.parseInt(query.cache);
        const entityFields = this.parseEntityFields(query);
        const result = {
            filter: [...filter, ...entityFields],
            or,
            fields,
            sort,
            join,
            limit,
            offset,
            page,
            cache,
        };
        return result;
    }
    splitString(str) {
        return typeof str === 'string' ? str.split(this.delimStr) : [];
    }
    parseInt(str) {
        return typeof str === 'string' ? parseInt(str, 10) : undefined;
    }
    parseFilter(str) {
        if (typeof str !== 'string')
            return;
        const isArrayValue = ['in', 'notin', 'between'];
        const params = str.split(this.delim);
        const field = params[0];
        const operator = params[1];
        let value = params[2] || '';
        if (isArrayValue.includes(operator)) {
            value = this.splitString(value);
        }
        return {
            field,
            operator,
            value,
        };
    }
    parseSort(str) {
        if (typeof str !== 'string')
            return;
        const params = str.split(this.delimStr);
        return {
            field: params[0],
            order: params[1],
        };
    }
    parseJoin(str) {
        if (typeof str !== 'string')
            return;
        const params = str.split(this.delim);
        return {
            field: params[0],
            select: params[1] ? this.splitString(params[1]) : [],
        };
    }
    parseArray(param, parser) {
        if (typeof param === 'string') {
            return [parser.call(this, param)];
        }
        if (Array.isArray(param) && param.length) {
            const result = [];
            for (const item of param) {
                result.push(parser.call(this, item));
            }
            return result;
        }
        return [];
    }
    parseEntityFields(query) {
        return Object.keys(query)
            .filter((key) => !this.reservedFields.includes(key))
            .map((field) => ({ field, operator: 'eq', value: query[field] }));
    }
};
RestfulQueryInterceptor = __decorate([
    common_1.Injectable()
], RestfulQueryInterceptor);
exports.RestfulQueryInterceptor = RestfulQueryInterceptor;
//# sourceMappingURL=restful-query.interceptor.js.map