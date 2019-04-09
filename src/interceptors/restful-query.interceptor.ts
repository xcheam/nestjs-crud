import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { isObject } from '@nestjs/common/utils/shared.utils';

import {
  RequestParamsParsed,
  FilterParamParsed,
  SortParamParsed,
  JoinParamParsed,
} from '../interfaces';
import { RequestQueryParams } from '../interfaces';
import { ComparisonOperator } from '../types';
import { PARSED_QUERY_REQUEST_KEY } from '../constants';

@Injectable()
export class RestfulQueryInterceptor implements NestInterceptor {
  private delim = '||';
  private delimStr = ',';
  private reservedFields = [
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

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();

    req[PARSED_QUERY_REQUEST_KEY] = this.transform(req.query);

    return next.handle();
  }

  private transform(query: RequestQueryParams): RequestParamsParsed {
    if (!isObject(query) || !Object.keys(query).length) {
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

  private splitString(str: string): string[] {
    return typeof str === 'string' ? str.split(this.delimStr) : [];
  }

  private parseInt(str: string): number {
    return typeof str === 'string' ? parseInt(str, 10) : undefined;
  }

  private parseFilter(str: string): FilterParamParsed {
    if (typeof str !== 'string') return;

    const isArrayValue = ['in', 'notin', 'between'];
    const params = str.split(this.delim);
    const field = params[0];
    const operator = params[1] as ComparisonOperator;
    let value = params[2] || '';

    if (isArrayValue.includes(operator)) {
        value = this.splitString(value) as any;
      }

    return {
      field,
      operator,
      value,
    };
  }

  private parseSort(str: string): SortParamParsed {
    if (typeof str !== 'string') return;

    const params = str.split(this.delimStr);

    return {
      field: params[0],
      order: params[1] as any,
    };
  }

  private parseJoin(str: string): JoinParamParsed {
    if (typeof str !== 'string') return;

    const params = str.split(this.delim);

    return {
      field: params[0],
      select: params[1] ? this.splitString(params[1]) : [],
    };
  }

  private parseArray(param: string[], parser: Function) {
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

  private parseEntityFields(query: RequestQueryParams): FilterParamParsed[] {
    return Object.keys(query)
      .filter((key) => !this.reservedFields.includes(key))
      .map((field) => ({ field, operator: 'eq', value: query[field] } as FilterParamParsed));
  }
}
