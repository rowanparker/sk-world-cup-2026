import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Avatar, initials } from './Avatar'

describe('initials', () => {
  it('takes the first letter of up to two words', () => {
    expect(initials('Rowan')).toBe('R')
    expect(initials('Ange T')).toBe('AT')
  })

  it('ignores "&" joiners', () => {
    expect(initials('Fleur & Galina')).toBe('FG')
    expect(initials('Sal & TX')).toBe('ST')
  })
})

describe('Avatar', () => {
  it('renders an initials placeholder when no src is given', () => {
    render(<Avatar name="Rowan" />)
    const el = screen.getByLabelText('Rowan')
    expect(el).toHaveTextContent('R')
  })

  it('renders an image when src is provided', () => {
    render(<Avatar name="Rowan" src="/avatars/rowan.jpg" />)
    const img = screen.getByRole('img', { name: 'Rowan' })
    expect(img).toHaveAttribute('src', '/avatars/rowan.jpg')
  })
})
