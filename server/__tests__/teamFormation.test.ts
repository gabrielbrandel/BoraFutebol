import { describe, it, expect } from 'vitest'
import { generateBalancedTeams } from '../lib/teamFormation.js'
import type { PlayerForFormation } from '../lib/teamFormation.js'

function player(id: string, level: number, position: PlayerForFormation['position'] = 'Midfielder'): PlayerForFormation {
  return { userId: id, name: id, position, technicalLevel: level }
}

describe('teamFormation', () => {
  it('divide jogadores em dois times', () => {
    const players = [
      player('a', 5, 'Forward'),
      player('b', 4, 'Defender'),
      player('c', 3, 'Midfielder'),
      player('d', 2, 'Goalkeeper')
    ]
    const { teamA, teamB } = generateBalancedTeams(players)
    expect(teamA.length + teamB.length).toBe(4)
    expect(teamA.length).toBeGreaterThan(0)
    expect(teamB.length).toBeGreaterThan(0)
  })

  it('balanceia nível técnico entre times', () => {
    const players = [
      player('p1', 5), player('p2', 5), player('p3', 1), player('p4', 1)
    ]
    const { teamA, teamB, scoreA, scoreB } = generateBalancedTeams(players)
    expect(Math.abs(scoreA - scoreB)).toBeLessThanOrEqual(4)
    expect(teamA.length).toBe(2)
    expect(teamB.length).toBe(2)
  })

  it('retorna vazio com menos de 2 jogadores', () => {
    const result = generateBalancedTeams([player('solo', 3)])
    expect(result.teamA).toEqual([])
    expect(result.teamB).toEqual([])
  })
})
