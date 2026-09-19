// The source of truth for every user-facing string. `tr.ts` is typed against
// this object, so a key added here and missing there fails the typecheck.
//
// Rules the keys do not enforce:
// - Gender-neutral: "your partner", "they/them" — the app never asks.
// - No `count` option: i18next resolves plurals through Intl.PluralRules, which
//   Hermes does not implement. Pick the key in code instead (see `pings.dropped*`).
// - Strings shown in capitals are written in capitals here, not with
//   `textTransform: 'uppercase'`, which Android applies with the *device*
//   locale's rules and turns Turkish "i" into "I" rather than "İ".
export const en = {
  common: {
    continue: 'Continue',
    cancel: 'Cancel',
    back: 'Back',
    close: 'Close',
    or: 'or',
    yourPartner: 'Your partner',
    signOut: 'Sign out',
    genericError: 'Something went wrong. Try again.',
  },
  auth: {
    tagline: 'A quiet line between the two of you. Nothing else lives here.',
    phoneLabel: 'PHONE NUMBER',
    phonePlaceholder: '+1 234 567 8900',
    phoneInvalid: 'Enter your phone number with country code (e.g. +1...)',
    phonePrivacy: 'We use it once, to find your person.',
    devHint: 'dev: enter 01 or 02 for the seeded test accounts',
    devUnknownUser: 'Unknown test user.',
    codeTitle: 'Enter the code',
    codeSentTo: 'Sent to {{phone}}',
    codeInvalid: 'Invalid code. Try again.',
    codeResent: 'Code sent again',
    resendIn: 'Resend in {{time}}',
    resend: 'Send a new code',
    claimFailed: 'Could not finish signing in. Try again.',
    signOutFailed: 'Could not sign out. Try again.',
    sessionReplaced: 'You signed in on another phone, so you were signed out here.',
  },
  onboarding: {
    title: 'What should they call you?',
    subtitle: 'This is the only name in the app.',
    choosePhoto: 'Choose a photo',
    namePlaceholder: 'Your name',
    nameRequired: 'Enter a name to continue',
    photoFailed: 'Could not save your photo — carrying on without it.',
    saveFailed: 'Could not save profile. Try again.',
  },
  pair: {
    codeTitle: 'Your pairing code',
    expiresIn: 'Expires in {{time}}',
    expired: 'This code has expired. Get a new one below.',
    refresh: 'Get a new code',
    copied: 'Code copied',
    inviteWithCode: 'Send them this code. It works once, and expires in 15 minutes.',
    haveCode: 'I have their code',
    generateFailed: 'Could not generate a code. Try again.',
    enterTitle: 'Their code',
    enterSubtitle: 'Six characters, from their phone.',
    paste: 'Paste from clipboard',
    enterInvalid: 'Invalid or expired code. Try again.',
    clipboardEmpty: 'No code on your clipboard.',
    copy: 'Copy',
    share: 'Share',
    shareMessage: "Let's connect on Imm! Enter my pairing code to link our accounts: {{code}}",
    connected: "YOU'RE CONNECTED",
    youAnd: 'You and {{name}}',
    connectedBody: 'From now on, one touch reaches them.',
    holdFirst: 'hold to send the first one',
  },
  home: {
    sendMoment: 'Send a photo ping',
    takePhoto: 'Take photo',
    chooseFromLibrary: 'Choose from library',
    offlineWaiting: 'offline — {{n}} waiting',
    offlineLater: 'offline — will send later',
    removePhoto: 'remove',
    history: 'Ping history',
    settings: 'Settings',
    addPhoto: 'Add a photo',
  },
  pings: {
    thinkingOfYou: 'is thinking of you',
    justNow: 'JUST NOW',
    holdToAnswer: 'hold to answer',
    notificationTitle: '{{name}} is thinking of you',
    sentMoment: 'Sent you a photo ping',
    droppedOne: "A ping couldn't be delivered.",
    droppedMany: "{{n}} pings couldn't be delivered.",
  },
  thread: {
    loadFailed: 'Could not load your pings.',
    empty: 'No pings yet.',
    queued: 'queued',
    you: 'you',
    them: 'them',
    today: 'today',
    yesterday: 'yesterday',
  },
  settings: {
    title: 'Settings',
    changePhoto: 'Change profile picture',
    addPhoto: 'Add profile picture',
    savingPhoto: 'Saving photo…',
    photoFailed: 'Could not save your photo. Try again.',
    togetherSince: 'together since {{date}}',
    vibrate: 'Vibrate on arrival',
    language: 'Language',
    deleteAccount: 'Delete account',
    deleteTitle: 'Delete your account?',
    deleteBody:
      'Your profile, your photos and your whole ping history are deleted for good, and you are disconnected from your partner. This cannot be undone.',
    deleteConfirm: 'Delete for good',
    deleteFailed: "Couldn't delete your account. Try again.",
  },
  unpair: {
    disconnect: 'Disconnect',
    disconnectFrom: 'Disconnect from {{name}}',
    confirm: 'Disconnect?',
    confirmFrom: 'Disconnect from {{name}}?',
    confirmBody:
      "You'll stop receiving each other's pings, and your ping history and photos together are deleted. You can pair again later.",
    partnerLeft: '{{name}} disconnected.',
    noLongerConnected: 'You are no longer connected.',
  },
  notFound: {
    title: 'Page not found',
    goHome: 'Go home',
  },
};

type Strings<T> = { [K in keyof T]: T[K] extends string ? string : Strings<T[K]> };
export type Translation = Strings<typeof en>;
