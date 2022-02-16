(let* 
  (
    (image      (car (gimp-file-load RUN-NONINTERACTIVE "IMAGE.xcf" "IMAGE.xcf")))
    (num-layers (car (gimp-image-get-layers image) ) )
    (layer-ids  (cadr (gimp-image-get-layers image) ) )
    (change-all-text (lambda (idx)
      (if (< idx num-layers)
        (let*
          (
            (curr-layer (vector-ref layer-ids idx))
            (curr-is-text (car (gimp-item-is-text-layer curr-layer)))
            (curr-name (car (gimp-item-get-name curr-layer)))
          )
          (if (= 1 curr-is-text)
            (gimp-message "JS Interpolation here")
          )
          (change-all-text (+ idx 1))
        )
      )
    ))
  )
  (change-all-text 0)
  (gimp-image-flatten image)
  (file-png-save-defaults
    RUN-NONINTERACTIVE
    image
    (car (gimp-image-get-active-drawable image))
    "temp.png"
    "temp.png"
  )
  (gimp-image-delete image)
            (gimp-message "END!!!")
  (gimp-quit 0)
)