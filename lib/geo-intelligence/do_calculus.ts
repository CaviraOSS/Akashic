import { build_causal_dag, causal_dag, causal_node } from "./causal_inference"




export interface intervention_result {
  intervened_event_id: string
  original_dag: causal_dag
  counterfactual_probabilities: { event_id: string, new_probability: number }[]
}


export const perform_do_calculus_intervention = async (target_event_id: string): Promise<intervention_result> => {
  const dag = await build_causal_dag()

  const target_node = dag.nodes.find(n => n.event_id === target_event_id)
  if (!target_node) throw new Error("target event not found in causal dag")

  const new_probs = new Map<string, number>()
  
  
  dag.nodes.forEach(n => new_probs.set(n.event_id, n.base_probability))

  
  new_probs.set(target_event_id, 0.0) 

  
  
  let changed = true
  let passes = 0
  
  while (changed && passes < 10) {
    changed = false
    passes++

    for (const node of dag.nodes) {
      if (node.event_id === target_event_id) continue 

      
      const incoming = dag.edges.filter(e => e.effect_id === node.event_id)
      if (incoming.length === 0) continue 

      let new_p = 0
      for (const edge of incoming) {
        const p_cause = new_probs.get(edge.cause_id) || 0
        new_p += p_cause * edge.conditional_probability
      }
      
      
      new_p = Math.min(1.0, new_p)

      const old_p = new_probs.get(node.event_id) || 0
      if (Math.abs(new_p - old_p) > 0.001) {
        new_probs.set(node.event_id, new_p)
        changed = true
      }
    }
  }

  const counterfactual_probabilities = Array.from(new_probs.entries()).map(([id, prob]) => ({
    event_id: id,
    new_probability: parseFloat(prob.toFixed(4))
  }))

  return {
    intervened_event_id: target_event_id,
    original_dag: dag,
    counterfactual_probabilities
  }
}
