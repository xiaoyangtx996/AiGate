import type { BadgeProps, TableColumn } from '@nuxt/ui'
import { UBadge, UButton, UUser } from '#components'
import { METHODS } from '@/enums'

export function useLogColumns(options?: { onDetail?: (row: Log) => void }) {
  const { createCreatedAtColumn, createExpandColumn } = useTableColumns()

  const { i18nCommon, i18nLog } = useMessage()

  const { getUserDisplayName } = useCurrentUser()

  const columns = computed<TableColumn<Log>[]>(() => [
    createExpandColumn(),
    {
      accessorKey: 'user',
      header: i18nLog('user'),
      cell: ({ row }) => {
        const u = row.original.user
        const userName = getUserDisplayName(u)
        return h(UUser, {
          name: userName,
          description: userName === u.email ? undefined : u.email,
          avatar: {
            src: u.image || undefined,
            alt: userName?.slice(0, 2).toUpperCase(),
            loading: 'lazy',
          },
          ui: {
            wrapper: 'text-left',
          },
        })
      },
    },
    {
      accessorKey: 'action',
      header: i18nCommon('action'),
      cell: ({ row }) => h('span', { class: 'font-mono text-xs' }, row.original.action),
    },
    {
      accessorKey: 'targetType',
      header: 'Target',
      cell: ({ row }) => h(UBadge, { variant: 'soft', color: 'neutral' }, () => row.original.targetType || '-'),
    },
    {
      accessorKey: 'targetId',
      header: 'Target ID',
      cell: ({ row }) => h('span', { class: 'font-mono text-xs text-muted' }, row.original.targetId || '-'),
    },
    {
      accessorKey: 'method',
      header: i18nLog('method'),
      cell: ({ row }) => {
        const val = row.original.method
        const colorMap: Record<Methods, BadgeProps['color']> = {
          [METHODS.GET]: 'success',
          [METHODS.POST]: 'warning',
          [METHODS.PUT]: 'info',
          [METHODS.DELETE]: 'error',
        }
        return h(UBadge, { variant: 'soft', color: colorMap[val] }, () => val)
      },
    },
    ...['ip', 'os', 'browser', 'device'].map<TableColumn<Log>>(key => ({
      accessorKey: key,
      header: i18nLog(key),
      cell: ({ row }) => h(UBadge, { variant: 'soft', color: 'neutral' }, () => row.getValue(key)),
    })),
    createCreatedAtColumn(),
    {
      accessorKey: 'detail',
      header: 'Detail',
      cell: ({ row }) =>
        h(UButton, {
          size: 'xs',
          variant: 'ghost',
          icon: 'lucide:panel-right-open',
          onClick: () => options?.onDetail?.(row.original),
        }),
    },
  ])

  return {
    columns,
  }
}
