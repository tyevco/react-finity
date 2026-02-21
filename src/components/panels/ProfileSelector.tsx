import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useProfileStore } from '@/store/profileStore'

export function ProfileSelector() {
  const activeProfileKey = useProfileStore((s) => s.activeProfileKey)
  const profiles = useProfileStore((s) => s.profiles)
  const setActiveProfile = useProfileStore((s) => s.setActiveProfile)

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">Dimension Profile</Label>
      <Select value={activeProfileKey} onValueChange={setActiveProfile}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(profiles).map(([key, profile]) => (
            <SelectItem key={key} value={key} className="text-xs">
              {profile.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
