import { createContext, useContext } from 'react'
import { usePlansV2 } from '../hooks/usePlansV2'

const PlansContext = createContext(null)

export function PlansProvider({ children }) {
  const plans = usePlansV2()
  return <PlansContext.Provider value={plans}>{children}</PlansContext.Provider>
}

export function usePlans() {
  const ctx = useContext(PlansContext)
  if (!ctx) throw new Error('usePlans must be inside PlansProvider')
  return ctx
}
