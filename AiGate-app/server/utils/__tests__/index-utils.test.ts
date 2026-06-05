import { describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import {
  catchError,
  convertFlatDataToTree,
  responseError,
  responseSuccess,
  transformToLangTree,
} from '../index'

describe('index utils', () => {
  describe('responseSuccess', () => {
    it('should return success response with defaults', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-05T10:00:00Z'))

      const result = responseSuccess({ id: 1 })

      expect(result).toEqual({
        data: { id: 1 },
        msg: RESPONSE_CODE.label(RESPONSE_CODE.SUCCESS),
        code: RESPONSE_CODE.SUCCESS,
        timestamp: Date.now(),
      })

      vi.useRealTimers()
    })

    it('should accept custom msg and code', () => {
      const result = responseSuccess(null, '自定义成功', RESPONSE_CODE.BAD_REQUEST)

      expect(result.msg).toBe('自定义成功')
      expect(result.code).toBe(RESPONSE_CODE.BAD_REQUEST)
    })
  })

  describe('responseError', () => {
    it('should return error response with default message', () => {
      const result = responseError(null)

      expect(result.data).toBeNull()
      expect(result.msg).toBe(RESPONSE_CODE.label(RESPONSE_CODE.SERVER_ERROR))
      expect(result.code).toBe(RESPONSE_CODE.SERVER_ERROR)
      expect(typeof result.timestamp).toBe('number')
    })

    it('should accept custom message', () => {
      const result = responseError({ detail: 'fail' }, '操作失败')

      expect(result.data).toEqual({ detail: 'fail' })
      expect(result.msg).toBe('操作失败')
    })
  })

  describe('catchError', () => {
    it('should extract message from Error instance', () => {
      const result = catchError(new Error('数据库连接失败'))

      expect(result.data).toBeNull()
      expect(result.msg).toBe('数据库连接失败')
      expect(result.code).toBe(RESPONSE_CODE.SERVER_ERROR)
    })

    it('should use string error directly', () => {
      const result = catchError('请求超时')

      expect(result.msg).toBe('请求超时')
    })

    it('should fall back to unknown error message', () => {
      const result = catchError({ code: 500 })

      expect(result.msg).toBe('未知错误')
    })

    it('should handle null and undefined errors', () => {
      expect(catchError(null).msg).toBe('未知错误')
      expect(catchError(undefined).msg).toBe('未知错误')
    })
  })

  describe('convertFlatDataToTree', () => {
    it('should build nested tree from flat nodes', () => {
      const flat = [
        { id: '1', name: 'root', parentId: null },
        { id: '2', name: 'child-a', parentId: '1' },
        { id: '3', name: 'child-b', parentId: '1' },
        { id: '4', name: 'grandchild', parentId: '2' },
      ]

      const tree = convertFlatDataToTree(flat, null)

      expect(tree).toHaveLength(1)
      expect(tree[0].id).toBe('1')
      expect(tree[0].children).toHaveLength(2)
      expect(tree[0].children?.[0].id).toBe('2')
      expect(tree[0].children?.[0].children?.[0].id).toBe('4')
      expect(tree[0].children?.[0].children?.[0].children).toBeUndefined()
    })

    it('should treat nodes without parent as roots', () => {
      const flat = [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B', parentId: 'missing' },
      ]

      const tree = convertFlatDataToTree(flat)

      expect(tree).toHaveLength(2)
      expect(tree.map(n => n.id)).toEqual(['a', 'b'])
    })

    it('should return empty array for empty input', () => {
      expect(convertFlatDataToTree([])).toEqual([])
    })

    it('should build multi-level tree with shared parent references', () => {
      const flat = [
        { id: '1', name: 'root', parentId: null },
        { id: '2', name: 'branch-a', parentId: '1' },
        { id: '3', name: 'branch-b', parentId: '1' },
        { id: '4', name: 'leaf', parentId: '2' },
      ]

      const tree = convertFlatDataToTree(flat, null)
      const leaf = tree[0].children?.[0].children?.[0]

      expect(leaf?.id).toBe('4')
      expect(leaf?.children).toBeUndefined()
    })

    it('should omit empty children arrays from output nodes', () => {
      const flat = [{ id: 'solo', name: 'Solo', parentId: null }]
      const tree = convertFlatDataToTree(flat, null)

      expect(tree[0].children).toBeUndefined()
    })
  })

  describe('transformToLangTree', () => {
    it('should map nested tree nodes to locale objects', () => {
      const nodes = [
        {
          id: '1',
          name: 'common',
          en: null,
          zh: null,
          children: [
            { id: '2', name: 'save', en: 'Save', zh: '保存', children: [] },
            { id: '3', name: 'cancel', en: 'Cancel', zh: '取消', children: [] },
          ],
        },
        {
          id: '4',
          name: 'title',
          en: 'Dashboard',
          zh: '仪表盘',
          children: [],
        },
      ] as InternalizationTree[]

      const result = transformToLangTree(nodes)

      expect(result.en).toEqual({
        common: { save: 'Save', cancel: 'Cancel' },
        title: 'Dashboard',
      })
      expect(result['zh-CN']).toEqual({
        common: { save: '保存', cancel: '取消' },
        title: '仪表盘',
      })
    })

    it('should return empty locale objects for empty input', () => {
      expect(transformToLangTree([])).toEqual({ en: {}, 'zh-CN': {} })
    })

    it('should skip missing locale values on leaf nodes', () => {
      const nodes = [
        { id: '1', name: 'onlyEn', en: 'Hello', zh: null, children: [] },
        { id: '2', name: 'onlyZh', en: null, zh: '你好', children: [] },
      ] as InternalizationTree[]

      const result = transformToLangTree(nodes)

      expect(result.en).toEqual({ onlyEn: 'Hello' })
      expect(result['zh-CN']).toEqual({ onlyZh: '你好' })
    })

    it('should build deeply nested locale objects', () => {
      const nodes = [
        {
          id: '1',
          name: 'app',
          en: null,
          zh: null,
          children: [
            {
              id: '2',
              name: 'nav',
              en: null,
              zh: null,
              children: [
                { id: '3', name: 'home', en: 'Home', zh: '首页', children: [] },
              ],
            },
          ],
        },
      ] as InternalizationTree[]

      const result = transformToLangTree(nodes)

      expect(result.en).toEqual({ app: { nav: { home: 'Home' } } })
      expect(result['zh-CN']).toEqual({ app: { nav: { home: '首页' } } })
    })
  })
})
