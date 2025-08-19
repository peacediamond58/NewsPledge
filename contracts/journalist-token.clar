;; NewsPledge Journalist Token Contract
;; Clarity v2
;; Manages journalist-specific tokens for funding and voting in the NewsPledge ecosystem

;; Error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INSUFFICIENT-BALANCE u101)
(define-constant ERR-INSUFFICIENT-STAKE u102)
(define-constant ERR-MAX-SUPPLY-REACHED u103)
(define-constant ERR-PAUSED u104)
(define-constant ERR-ZERO-ADDRESS u105)
(define-constant ERR-STAKE-LOCKED u106)
(define-constant ERR-INVALID-AMOUNT u107)
(define-constant ERR-ALREADY-DELEGATE u108)

;; Token metadata
(define-constant TOKEN-NAME "NewsPledge Journalist Token")
(define-constant TOKEN-SYMBOL "NPJT")
(define-constant TOKEN-DECIMALS u6)
(define-constant MAX-SUPPLY u1000000000) ;; 1B tokens max (decimals accounted separately)
(define-constant STAKE-LOCK-PERIOD u1440) ;; ~1 day in blocks (assuming ~10min/block)

;; Contract state
(define-data-var admin principal tx-sender)
(define-data-var paused bool false)
(define-data-var total-supply uint u0)
(define-data-var delegate-admin (optional principal) none)

;; Data maps
(define-map balances principal uint)
(define-map staked-balances principal uint)
(define-map stake-timestamps principal uint) ;; Tracks when tokens were staked
(define-map allowances { owner: principal, spender: principal } uint)

;; Private helper: Check if caller is admin or delegate
(define-private (is-authorized)
  (or 
    (is-eq tx-sender (var-get admin))
    (is-eq (some tx-sender) (var-get delegate-admin))
  )
)

;; Private helper: Ensure contract is not paused
(define-private (ensure-not-paused)
  (asserts! (not (var-get paused)) (err ERR-PAUSED))
)

;; Private helper: Check if stake is unlocked
(define-private (is-stake-unlocked (account principal) (amount uint))
  (let ((stake-time (default-to u0 (map-get? stake-timestamps account))))
    (asserts! (>= (- block-height stake-time) STAKE-LOCK-PERIOD) (err ERR-STAKE-LOCKED))
    (ok true)
  )
)

;; Admin: Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-admin 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (var-set admin new-admin)
    (ok true)
  )
)

;; Admin: Set delegate admin
(define-public (set-delegate-admin (delegate (optional principal)))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq delegate (some 'SP000000000000000000002Q6VF78))) (err ERR-ZERO-ADDRESS))
    (var-set delegate-admin delegate)
    (ok true)
  )
)

;; Admin: Pause/unpause contract
(define-public (set-paused (pause bool))
  (begin
    (asserts! (is-authorized) (err ERR-NOT-AUTHORIZED))
    (var-set paused pause)
    (ok pause)
  )
)

;; Admin: Mint new tokens
(define-public (mint (recipient principal) (amount uint))
  (begin
    (asserts! (is-authorized) (err ERR-NOT-AUTHORIZED))
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (asserts! (not (is-eq recipient 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (let ((new-supply (+ (var-get total-supply) amount)))
      (asserts! (<= new-supply MAX-SUPPLY) (err ERR-MAX-SUPPLY-REACHED))
      (map-set balances recipient (+ amount (default-to u0 (map-get? balances recipient))))
      (var-set total-supply new-supply)
      (ok true)
    )
  )
)

;; Burn tokens
(define-public (burn (amount uint))
  (begin
    (ensure-not-paused)
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (let ((balance (default-to u0 (map-get? balances tx-sender))))
      (asserts! (>= balance amount) (err ERR-INSUFFICIENT-BALANCE))
      (map-set balances tx-sender (- balance amount))
      (var-set total-supply (- (var-get total-supply) amount))
      (ok true)
    )
  )
)

;; Transfer tokens
(define-public (transfer (recipient principal) (amount uint))
  (begin
    (ensure-not-paused)
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (asserts! (not (is-eq recipient 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (let ((sender-balance (default-to u0 (map-get? balances tx-sender))))
      (asserts! (>= sender-balance amount) (err ERR-INSUFFICIENT-BALANCE))
      (map-set balances tx-sender (- sender-balance amount))
      (map-set balances recipient (+ amount (default-to u0 (map-get? balances recipient))))
      (ok true)
    )
  )
)

;; Approve allowance for spending
(define-public (approve (spender principal) (amount uint))
  (begin
    (ensure-not-paused)
    (asserts! (not (is-eq spender 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (map-set allowances { owner: tx-sender, spender: spender } amount)
    (ok true)
  )
)

;; Transfer tokens on behalf of another account
(define-public (transfer-from (owner principal) (recipient principal) (amount uint))
  (begin
    (ensure-not-paused)
    (asserts! (not (is-eq recipient 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (let (
      (allowance (default-to u0 (map-get? allowances { owner: owner, spender: tx-sender })))
      (owner-balance (default-to u0 (map-get? balances owner)))
    )
      (asserts! (>= allowance amount) (err ERR-NOT-AUTHORIZED))
      (asserts! (>= owner-balance amount) (err ERR-INSUFFICIENT-BALANCE))
      (map-set allowances { owner: owner, spender: tx-sender } (- allowance amount))
      (map-set balances owner (- owner-balance amount))
      (map-set balances recipient (+ amount (default-to u0 (map-get? balances recipient))))
      (ok true)
    )
  )
)

;; Stake tokens for voting power
(define-public (stake (amount uint))
  (begin
    (ensure-not-paused)
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (let ((balance (default-to u0 (map-get? balances tx-sender))))
      (asserts! (>= balance amount) (err ERR-INSUFFICIENT-BALANCE))
      (map-set balances tx-sender (- balance amount))
      (map-set staked-balances tx-sender (+ amount (default-to u0 (map-get? staked-balances tx-sender))))
      (map-set stake-timestamps tx-sender block-height)
      (ok true)
    )
  )
)

;; Unstake tokens
(define-public (unstake (amount uint))
  (begin
    (ensure-not-paused)
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (try! (is-stake-unlocked tx-sender amount))
    (let ((stake-balance (default-to u0 (map-get? staked-balances tx-sender))))
      (asserts! (>= stake-balance amount) (err ERR-INSUFFICIENT-STAKE))
      (map-set staked-balances tx-sender (- stake-balance amount))
      (map-set balances tx-sender (+ amount (default-to u0 (map-get? balances tx-sender))))
      (if (is-eq stake-balance amount)
        (map-delete stake-timestamps tx-sender)
        (ok true)
      )
      (ok true)
    )
  )
)

;; Read-only: Get balance
(define-read-only (get-balance (account principal))
  (ok (default-to u0 (map-get? balances account)))
)

;; Read-only: Get staked balance
(define-read-only (get-staked-balance (account principal))
  (ok (default-to u0 (map-get? staked-balances account)))
)

;; Read-only: Get allowance
(define-read-only (get-allowance (owner principal) (spender principal))
  (ok (default-to u0 (map-get? allowances { owner: owner, spender: spender })))
)

;; Read-only: Get total supply
(define-read-only (get-total-supply)
  (ok (var-get total-supply))
)

;; Read-only: Get admin
(define-read-only (get-admin)
  (ok (var-get admin))
)

;; Read-only: Get delegate admin
(define-read-only (get-delegate-admin)
  (ok (var-get delegate-admin))
)

;; Read-only: Check if paused
(define-read-only (is-paused)
  (ok (var-get paused))
)

;; Read-only: Get stake lock time
(define-read-only (get-stake-lock-time (account principal))
  (ok (default-to u0 (map-get? stake-timestamps account)))
)