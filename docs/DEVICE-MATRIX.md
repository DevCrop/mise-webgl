# Device And Browser Matrix

## 설계 대응

### iPhone / iOS Safari

- `100svh`로 toolbar가 표시된 안정적인 최소 높이를 기준으로 hero를 배치한다.
- `viewport-fit=cover`와 safe-area padding으로 notch와 home indicator를 보호한다.
- BFCache 이동에는 `pagehide/pageshow`를 사용하고 `unload` listener를 만들지 않는다.
- iOS Safari 실제 기기에서 세로·가로 회전, 주소창 축소·확장, 뒤로가기 복원을 확인한다.

### Samsung Galaxy / Samsung Internet

Samsung 공식 자료는 모바일 toolbar가 일반적으로 하단에 위치할 수 있음을 설명한다. toolbar 높이와 위치를 고정값으로 가정하지 않고 `svh`, `VisualViewport`, safe-area와 실제 Galaxy 검증으로 대응한다.

- 하단 toolbar 표시·숨김 중 콘텐츠와 CTA가 가려지지 않아야 한다.
- Galaxy Fold/Flip은 좁은 front screen, 펼친 화면과 회전을 각각 확인한다.
- DeX는 큰 resizable desktop viewport로 취급한다.

공식 근거:

- https://developer.samsung.com/internet/blog/en/2020/07/07/samsung-internet-121
- https://developer.samsung.com/internet/android/web-developer-guide.html
- https://developer.samsung.com/conference/sdc22/sessions/flexible-and-private-web-experience-on-samsung-internet

### Firefox

- Firefox engine에서 layout, dialog, reduced motion와 WebGL fallback을 자동 검증한다.
- Playwright Firefox는 branded Firefox가 아니므로 release 전 Windows/macOS Firefox Stable과 Android Firefox 실제판을 확인한다.

### Desktop

- Windows: Chrome Stable, Edge Stable, Firefox Stable
- macOS: Safari Stable, Chrome Stable, Firefox Stable
- resize, zoom 200%, keyboard navigation와 GPU 비활성 상태를 확인한다.

## 자동화 Matrix

```text
Desktop Chromium
Desktop Firefox
Desktop WebKit
Android Chromium emulation
iPhone WebKit emulation
360×740 Firefox
```

Playwright의 WebKit과 Firefox는 branded Safari/Firefox 자체가 아니며 OS별 codec·platform behavior도 다를 수 있다. 따라서 자동화는 실제 iPhone·Galaxy 검증을 대체하지 않는다.

공식 근거:

- https://playwright.dev/docs/browsers
- https://developer.mozilla.org/en-US/docs/Web/API/Window/pagehide_event
- https://developer.mozilla.org/en-US/docs/Glossary/bfcache

## Release Gate

| 대상 | 필수 시나리오 |
|---|---|
| iPhone Safari | toolbar, 회전, BFCache, safe area, reduced motion |
| Galaxy Samsung Internet | 하단 toolbar, 회전, coarse pointer, WebGL context |
| Galaxy Chrome | viewport, GPU 성능, dialog, 스크롤 |
| Firefox Desktop/Android | layout, keyboard, fallback, reduced motion |
| Windows/macOS | zoom, resize, GPU on/off, 새로고침 |

