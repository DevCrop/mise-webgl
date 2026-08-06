# Host consumer example

`mise-webgl`을 npm 또는 workspace tarball로 설치해 사용하는 최소 Host 참조 구현이다.

## Verify

```bash
npm run verify:host-consumer
```

## Dependency policy

| 환경 | 권장 버전 정책 |
|---|---|
| production | exact pin (`0.1.0`) |
| development | caret (`^0.1.0`) + lockfile |
| automation | Renovate/Dependabot PR + Host CI |

Host CI는 이 예제의 `typecheck`를 최소 gate로 사용하고, 실제 제품 repo에서는 browser regression을 추가한다.

## Adoption

전체 절차는 [`packages/mise/docs/ADOPTION.md`](../../packages/mise/docs/ADOPTION.md)를 따른다.
