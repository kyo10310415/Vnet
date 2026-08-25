export type ProjectTalentDisplayInput = {
  talentType: 'individual' | 'group'
  talentGroupName?: string | null
  talents: Array<{
    order: number
    talent: { name: string }
  }>
}

export function formatProjectTalentName(project: ProjectTalentDisplayInput): string {
  const names = [...project.talents]
    .sort((a, b) => a.order - b.order)
    .map(assignment => assignment.talent.name)

  if (project.talentType === 'group' && project.talentGroupName) {
    return names.length
      ? `${project.talentGroupName}（${names.join('、')}）`
      : project.talentGroupName
  }

  return names.join('、') || '—'
}
