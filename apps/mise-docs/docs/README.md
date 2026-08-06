# MISE Docs application

## Ownership

- PHP request routing과 MVC composition
- package 문서 index와 search model
- Component catalog·API·guide·Prompt Catalog page
- 독립 build와 배포 artifact

## Boundary

- canonical package 문서를 복사하지 않고 index한다.
- `mise-ui`와 `mise-php`의 packaged public surface만 소비한다.
- internal Prompt record는 production artifact에 포함하지 않는다.
- Portfolio Host의 runtime·content·command를 전제하지 않는다.

현재 RC compatibility baseline은 `0.2.0-rc.1`이다. Build artifact는 PHP app,
vendored `mise-php`, compiled `MiseUi.css`와 compatibility JSON만 포함한다.
