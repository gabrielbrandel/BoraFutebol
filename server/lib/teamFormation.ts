import type { PlayerPosition } from '@prisma/client'

export interface PlayerForFormation {
  userId: string
  name: string
  photoUrl?: string | null
  position: PlayerPosition
  technicalLevel: number
}

const ALL_POSITIONS: PlayerPosition[] = [
  'Goalkeeper', 'Defender', 'RightBack', 'LeftBack',
  'DefensiveMidfielder', 'Midfielder', 'Forward'
]

export function generateBalancedTeams(players: PlayerForFormation[]) {
  if (players.length < 2) {
    return { teamA: [] as PlayerForFormation[], teamB: [] as PlayerForFormation[], scoreA: 0, scoreB: 0 }
  }

  const sorted = [...players].sort((a, b) => b.technicalLevel - a.technicalLevel)
  const teamA: PlayerForFormation[] = []
  const teamB: PlayerForFormation[] = []

  for (const player of sorted) {
    const scoreA = teamScore(teamA)
    const scoreB = teamScore(teamB)
    if (scoreA <= scoreB) teamA.push(player)
    else teamB.push(player)
  }

  balancePositions(teamA, teamB)
  return { teamA, teamB, scoreA: teamScore(teamA), scoreB: teamScore(teamB) }
}

function teamScore(team: PlayerForFormation[]) {
  return team.reduce((sum, p) => sum + p.technicalLevel, 0)
}

function balancePositions(teamA: PlayerForFormation[], teamB: PlayerForFormation[]) {
  for (const position of ALL_POSITIONS) {
    const countA = teamA.filter(p => p.position === position).length
    const countB = teamB.filter(p => p.position === position).length
    if (Math.abs(countA - countB) <= 1) continue

    const larger = countA > countB ? teamA : teamB
    const smaller = countA > countB ? teamB : teamA
    const movable = larger
      .filter(p => p.position === position)
      .sort((a, b) => a.technicalLevel - b.technicalLevel)[0]

    if (!movable) continue
    const idx = larger.indexOf(movable)
    larger.splice(idx, 1)
    smaller.push(movable)
  }
}
