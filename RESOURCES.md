# Safari ARKit and AR Quick Look Resources

## Knowledge

- [Apple: Quick Look Gallery](https://developer.apple.com/augmented-reality/quick-look/)
  Apple's live gallery and overview for USDZ/Quick Look experiences. Use for: seeing what Safari and system apps can open without a custom app.
- [Apple: Previewing a Model with AR Quick Look](https://developer.apple.com/documentation/arkit/previewing-a-model-with-ar-quick-look)
  Apple documentation for handing 3D content to AR Quick Look. Use for: the core browser/app handoff concept.
- [WebKit: Viewing Augmented Reality Assets in Safari for iOS](https://webkit.org/blog/8421/viewing-augmented-reality-assets-in-safari-for-ios/)
  WebKit's implementation notes for serving and linking USDZ from Safari. Use for: MIME type and `rel="ar"` basics.
- [Apple WWDC19: Advances in AR Quick Look](https://developer.apple.com/videos/play/wwdc2019/612/)
  Deep Apple session on AR Quick Look, vertical surfaces, fixed scaling, URL fragments, and iOS app integration. Use for: how Quick Look grew beyond simple model viewing.
- [Apple WWDC20: Shop online with AR Quick Look](https://developer.apple.com/videos/play/wwdc2020/10604/)
  Apple session focused on commerce-style AR Quick Look flows. Use for: customer actions, banners, and why AR can help purchase confidence.
- [Apple WWDC21: AR Quick Look, meet Object Capture](https://developer.apple.com/videos/play/wwdc2021/10078/)
  Apple session covering asset creation, web/app integration recap, file-size tradeoffs, and fixed-scale content. Use for: deciding how much asset quality is enough for phone delivery.
- [Apple: ARKit documentation](https://developer.apple.com/documentation/arkit)
  Apple's main ARKit documentation. Use for: native concepts like world tracking, plane detection, and anchors.
- [Apple: ARWorldTrackingConfiguration.PlaneDetection](https://developer.apple.com/documentation/arkit/arworldtrackingconfiguration/planedetection-swift.struct)
  Apple API page for enabling horizontal/vertical plane detection in native iOS ARKit. Use for: understanding what native apps control directly.
- [Apple: ARPlaneAnchor](https://developer.apple.com/documentation/arkit/arplaneanchor)
  Apple API page for detected surfaces in ARKit. Use for: understanding the native representation of walls, floors, and tables.
- [Apple WWDC23: Meet ARKit for spatial computing](https://developer.apple.com/videos/play/wwdc2023/10082/)
  Apple session explaining ARKit sessions, data providers, anchors, world tracking, and scene understanding. Use for: the mental model behind native ARKit.
- [model-viewer: Augmented Reality](https://modelviewer.dev/examples/augmentedreality/)
  Official `model-viewer` examples for `ar`, `ios-src`, `ar-scale`, `ar-placement`, Quick Look, Scene Viewer, and WebXR. Use for: this project's web component layer.
- [model-viewer: Documentation](https://modelviewer.dev/docs/)
  Official reference for `model-viewer` attributes. Use for: confirming attribute behavior before changing the AR launcher.

## Wisdom (Communities)

- [Apple Developer Forums: ARKit](https://developer.apple.com/forums/tags/arkit)
  Best place to search exact device, ARKit, Quick Look, RealityKit, and USDZ edge cases.
- [model-viewer GitHub discussions](https://github.com/google/model-viewer/discussions)
  Best place to search library-specific behavior for Quick Look, `ios-src`, generated USDZ, and AR mode launch behavior.

## Gaps

- We have not yet collected project-specific phone recordings or screenshots that compare successful Safari Quick Look launches against failed in-app browser launches.
