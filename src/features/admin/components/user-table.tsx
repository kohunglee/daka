import { ChevronUp, ChevronDown } from 'lucide-react'
import { useTranslation } from '@/features/i18n/provider'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { fmtDate } from '@/lib/format-date'
import type { AdminUserRow } from '@/features/admin/getAdminUsers'

interface Props {
  rows: AdminUserRow[]
  sortBy: string
  sortDir: 'asc' | 'desc'
  onSort: (col: string) => void
  onRowClick: (row: AdminUserRow) => void
}

export function initials(name: string, email: string): string {
  const src = (name || email).trim()
  const parts = src.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return src.slice(0, 2).toUpperCase()
}

/** 渲染用户的登录来源渠道徽章（Google / GitHub / 邮箱密码）。 */
function renderProviderBadges(providers?: string[]) {
  if (!providers || providers.length === 0) {
    return <span className="text-xs text-fg-3">—</span>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {providers.map((p) => {
        const label = p === 'google' ? 'Google' : p === 'github' ? 'GitHub' : p === 'credential' ? '邮箱' : p
        return (
          <Badge key={p} variant="outline" className="text-[11px] font-normal">
            {label}
          </Badge>
        )
      })}
    </div>
  )
}

export function UserTable({ rows, sortBy, sortDir, onSort, onRowClick }: Props) {
  const { t } = useTranslation()

  function SortHead({ col, label, className }: { col: string; label: string; className?: string }) {
    const active = sortBy === col
    return (
      <TableHead className={className}>
        <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => onSort(col)}>
          {label}
          {active && (sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
        </button>
      </TableHead>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortHead col="name" label={t('admin.name')} />
          <SortHead col="email" label={t('admin.email')} />
          <TableHead className="hidden sm:table-cell">渠道</TableHead>
          <TableHead>{t('admin.role')}</TableHead>
          {/* secondary columns fold away on phones — the detail drawer has them */}
          <TableHead className="hidden md:table-cell">{t('admin.plan')}</TableHead>
          <TableHead>{t('admin.status')}</TableHead>
          <SortHead col="createdAt" label={t('admin.createdAt')} className="hidden md:table-cell" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((u) => (
          <TableRow
            key={u.id}
            className="cursor-pointer"
            tabIndex={0}
            onClick={() => onRowClick(u)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onRowClick(u)
              }
            }}
          >
            <TableCell>
              <div className="flex items-center gap-2.5">
                <Avatar>
                  <AvatarImage src={u.image ?? undefined} alt="" />
                  <AvatarFallback>{initials(u.name, u.email)}</AvatarFallback>
                </Avatar>
                <span className="font-semibold text-foreground">{u.name}</span>
              </div>
            </TableCell>
            <TableCell><span className="font-mono text-[12.5px] text-fg-3">{u.email}</span></TableCell>
            <TableCell className="hidden sm:table-cell">{renderProviderBadges(u.providers)}</TableCell>
            <TableCell>{u.role === 'admin' ? <Badge variant="pro">{t('admin.roleAdmin')}</Badge> : <span className="text-fg-2">{u.role ?? 'user'}</span>}</TableCell>
            <TableCell className="hidden md:table-cell">{u.plan === 'pro' ? <Badge variant="pro">{t('admin.pro')}</Badge> : <span className="text-fg-3">{u.plan ? t('admin.free') : '—'}</span>}</TableCell>
            <TableCell>{u.banned ? <Badge variant="warn" dot>{t('admin.banned')}</Badge> : <Badge variant="ok" dot>{t('admin.active')}</Badge>}</TableCell>
            <TableCell className="hidden text-fg-3 md:table-cell">{fmtDate(u.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
