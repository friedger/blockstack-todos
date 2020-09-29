;; A public registry for to-do lists
;;
;; The registry allows to register public to-do lists with a Blockstack username.
;;
;; The ownership of the registry entry is represented by a NFT. Therefore, it is possible 
;; to transfer the registry entry without changing the meta data.

;; The NFT that defines ownership of the registry entry
(define-non-fungible-token entry-owner-nft uint)

;; Map of registry entries
;; The entry consists of username and a public url
(define-map registry
  ((registry-id uint))
  (
    (name (buff 30))
    (url (buff 255))
  )
)

;; A lookup map between username and registry entries.
;; There can be only one entry per username.
(define-map lookup
  ((name (buff 30)))
  ((registry-id uint))
)

(define-data-var last-registry-id uint u0)
(define-constant not-allowed-error u1)
;;
;; Public functions
;; 

;; Registers a public todo list url with a blockstack username
(define-public (register (name (buff 30)) (url (buff 255)))
  (let ((registry-id (+ u1 (var-get last-registry-id))))
    (var-set last-registry-id registry-id)
    (unwrap-panic (nft-mint? entry-owner-nft registry-id tx-sender))
    (assert-panic (map-insert registry {registry-id: registry-id} {name: name, url: url}))
    (assert-panic (map-insert lookup {name: name} {registry-id: registry-id}))
    (ok registry-id)
  )
)

;; Updates the registry entry
(define-public (update (name (buff 30)) (url (buff 200)))
  (let ((registry-id (registry-id-for name)))
    (let ((owner (unwrap-panic (nft-get-owner? entry-owner-nft registry-id))))
        (if (is-eq owner tx-sender)
            (begin
                (assert-panic (map-set registry {registry-id: registry-id} {name: name, url: url}))        
                (assert-panic (map-set lookup {name: name} {registry-id: registry-id}))
                (ok true)
            )
            (err not-allowed-error)
        )
    )
  )
)

;;
;; Private functions
;;

(define-private (registry-id-for (name (buff 30)))
  (unwrap-panic (get registry-id (map-get? lookup {name: name})))
)

;;
;; Public read-only functions
;;

;; Returns the stx address that owns the registry entry
(define-read-only (owner-of (name (buff 30)))
  (nft-get-owner? entry-owner-nft (registry-id-for name))
)

;; Returns the registry id of the newest entry
(define-read-only (get-last-registry-id)
  (var-get last-registry-id)
)

;;
;; Helper to abort/panic on bad method calls
;;

(define-data-var panic-trigger (optional bool) none)
(define-private (assert-panic (value bool))
  (if value true (unwrap-panic (var-get panic-trigger)))
)
