import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectDialog } from '../ProjectDialog'
import { useProjectManagerStore } from '@/store/projectManagerStore'
import { registerBuiltinKinds } from '@/engine/registry/builtins'
import type { ProjectMeta } from '@/types/gridfinity'

beforeAll(() => {
  registerBuiltinKinds()
})

const makeProject = (id: string, name: string): ProjectMeta => ({
  id,
  name,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-06-15T12:00:00.000Z',
})

describe('ProjectDialog', () => {
  beforeEach(() => {
    useProjectManagerStore.setState({
      projects: [],
      currentProjectId: 'proj-1',
      currentProjectName: 'My Project',
      isDirty: false,
    })
  })

  it('renders dialog title when open', () => {
    render(<ProjectDialog open={true} onOpenChange={vi.fn()} />)
    expect(screen.getByText('Manage Projects')).toBeInTheDocument()
  })

  it('shows empty state when no projects', () => {
    render(<ProjectDialog open={true} onOpenChange={vi.fn()} />)
    expect(screen.getByText(/No saved projects/)).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<ProjectDialog open={false} onOpenChange={vi.fn()} />)
    expect(screen.queryByText('Manage Projects')).not.toBeInTheDocument()
  })

  it('renders project list', () => {
    useProjectManagerStore.setState({
      projects: [makeProject('p1', 'Project Alpha'), makeProject('p2', 'Project Beta')],
    })
    render(<ProjectDialog open={true} onOpenChange={vi.fn()} />)
    expect(screen.getByText('Project Alpha')).toBeInTheDocument()
    expect(screen.getByText('Project Beta')).toBeInTheDocument()
  })

  it('shows "Current" badge on current project', () => {
    useProjectManagerStore.setState({
      projects: [makeProject('proj-1', 'My Project')],
      currentProjectId: 'proj-1',
    })
    render(<ProjectDialog open={true} onOpenChange={vi.fn()} />)
    expect(screen.getByText('Current')).toBeInTheDocument()
  })

  it('renders load, rename, delete buttons for each project', () => {
    useProjectManagerStore.setState({
      projects: [makeProject('p1', 'Test Project')],
    })
    render(<ProjectDialog open={true} onOpenChange={vi.fn()} />)
    expect(screen.getByLabelText('Load Test Project')).toBeInTheDocument()
    expect(screen.getByLabelText('Rename Test Project')).toBeInTheDocument()
    expect(screen.getByLabelText('Delete Test Project')).toBeInTheDocument()
  })

  it('enters rename mode on rename click', async () => {
    const user = userEvent.setup()
    useProjectManagerStore.setState({
      projects: [makeProject('p1', 'Test Project')],
    })
    render(<ProjectDialog open={true} onOpenChange={vi.fn()} />)
    await user.click(screen.getByLabelText('Rename Test Project'))
    expect(screen.getByLabelText('Project name')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm rename')).toBeInTheDocument()
    expect(screen.getByLabelText('Cancel rename')).toBeInTheDocument()
  })

  it('shows delete confirmation on delete click', async () => {
    const user = userEvent.setup()
    useProjectManagerStore.setState({
      projects: [makeProject('p1', 'Test Project')],
    })
    render(<ProjectDialog open={true} onOpenChange={vi.fn()} />)
    await user.click(screen.getByLabelText('Delete Test Project'))
    expect(screen.getByLabelText('Confirm delete')).toBeInTheDocument()
    expect(screen.getByLabelText('Cancel delete')).toBeInTheDocument()
  })

  it('calls onOpenChange(false) when loading a project', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    useProjectManagerStore.setState({
      projects: [makeProject('p1', 'Test Project')],
    })
    render(<ProjectDialog open={true} onOpenChange={onOpenChange} />)
    await user.click(screen.getByLabelText('Load Test Project'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
