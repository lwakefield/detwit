export interface Transition {
  to: string;
  predicate?: () => boolean;
}
interface Transitions<T> {
  [from: string]: (Transition & T)[];
}

export class StateMachine<T> {
  state: string;
  transitions: Transitions<T> = {};
  listeners: { [event : string]: ((...args: any) => void | Promise<void>)[] } = {};

  constructor(t: Transitions<T>, s: string) {
    this.transitions = t;
    this.state = s;
  }

  static makeTransitions<T>(
    input: ({ from: string; } & Transition & T)[],
  ): Transitions<T> {
    const transitions: Transitions<T> = {};
    for (const t of input) {
      const { from, to, predicate, ...rest } = t;
      if (!transitions[from]) transitions[from] = [];

      transitions[from].push({ to, predicate, ...(rest as unknown as T) });
    }
    return transitions;
  }

  availableTransitions(): (Transition & T)[] {
    return this.transitions[this.state]
    .filter((t) => t.predicate ? t.predicate() : true);
  }

  isValidTransition(name: string): boolean {
    return Boolean(
      this.availableTransitions().find((t) => t.to === name),
    );
  }

  on (event : string, fn : (...rest : any) => void | Promise<void>) {
    if (!this.listeners[event]) {
      this.listeners[event] = [fn];
    } else {
      this.listeners[event].push(fn);
    }
  }

  emit (event : string, ...rest : any) {
    const listeners = this.listeners[event] || [];
    return Promise.all(listeners.map(l => l(...rest)));
  }

  async gotoTransition(next: string) {
    if (!this.isValidTransition(next)) {
      throw new Error(`Invalid transition from: ${this.state} to: ${next}`);
    }

    await this.emit(`begin-transition`, this.state, next);
    await this.emit(`exit:${this.state}`);
    this.state = next;
    await this.emit(`enter:${next}`);
  }
}
