import { Random } from "https://deno.land/x/random/Random.js";

import { Transition, StateMachine } from "./sm.ts";

const transitions = StateMachine.makeTransitions<{ weight: number }>([
  { from: "start", to: "signup", weight: 100 },
  { from: "signup", to: "feed", weight: 100 },

  // feed page
  { from: "feed", to: "makePost", weight: 100 },
  { from: "makePost", to: "feed", weight: 100 },
  // { from: "feed", to: "nextPageOfFeed", weight: 100 },
  // { from: "nextPageOfFeed", to: "feed", weight: 100 },
  // { from: "feed", to: "likePost", weight: 100 },
  // { from: "feed", to: "viewUser", weight: 100 },
  // { from: "likePost", to: "feed", weight: 100 },
  // user page
  { from: "viewUser", to: "nextPageOfUser", weight: 100 },
  { from: "nextPageOfUser", to: "viewUser", weight: 100 },
  { from: "viewUser", to: "likePost", weight: 100 },
  { from: "viewUser", to: "feed", weight: 100 },
]);

export class UserProfile {
  sm: StateMachine<{ weight: number }>;
  url: string;
  username: string;
  password: string;
  cookie: string | null = null;
  html: string | null = null;

  constructor() {
    this.sm = new StateMachine<{ weight: number }>(transitions, "start");
    this.url = "/";
    this.username = Random.i.string(16);
    this.password = Random.i.string(16);

    this.sm.on('begin-transition', (from, to) => console.log(`Transitioning from ${from} to ${to}`));
    this.sm.on("enter:signup", this.signup.bind(this));
    this.sm.on("enter:feed", this.feed.bind(this));
    this.sm.on("enter:makePost", this.makePost.bind(this));
  }

  async tick(): Promise<void> {
    const transitions = this.sm
      .availableTransitions();

    const buckets: (typeof transitions[0] & {max: number})[] = [];
    let acc = 0;
    for (const t of transitions) {
      acc += t.weight;
      buckets.push({ max: acc, ...t });
    }
    const choice = Random.i.int(0, acc);

    for (const t of buckets) {
      if (choice < t.max) {
         await this.sm.gotoTransition(t.to);
         return;
      }
    }

    throw new Error('uh-oh');
  }

  async signup() {
    await fetch(
      Deno.env.get('APP_URL') + '/signup',
    ).then(r => r.text())

    const f = new FormData();
    f.append('username', this.username);
    f.append('password', this.password);

    await fetch(
      Deno.env.get('APP_URL') + '/api/v1/createuser',
      {
        method: 'post',
        body: f,
      }
    ).then(r => r.text());

    await fetch(
      Deno.env.get('APP_URL') + '/signin',
    ).then(r => r.text())
    let res = await fetch(
      Deno.env.get('APP_URL') + '/api/v1/createsession',
      {
        method: 'post',
        body: f,
      }
    );

    this.cookie = res.headers.get('set-cookie');
  }

  async feed() {
    this.html = await fetch(
      Deno.env.get('APP_URL') + '/',
      { headers: { cookie: this.cookie! }, }
    ).then(r => r.text())
  }

  async makePost() {
    const f = new FormData();
    f.append('content', Random.i.string(500));

    await fetch(
      Deno.env.get('APP_URL') + '/api/v1/createpost',
      {
        method: 'post',
        body: f,
        headers: { cookie: this.cookie! },
      }
    );
  }

  async likePost() {
    // const f = new FormData();
    // f.append('content', Random.i.string(500));

    // await fetch(
    //   Deno.env.get('APP_URL') + '/api/v1/createpost',
    //   {
    //     method: 'post',
    //     body: f,
    //     headers: { cookie: this.cookie! },
    //   }
    // );
  }
}

const u = new UserProfile();

while (true) {
  await u.tick();
  await new Promise(r => setTimeout(r, 100));
}
