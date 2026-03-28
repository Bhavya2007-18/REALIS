#ifndef MINGW_MUTEX_H
#define MINGW_MUTEX_H

#include <system_error>
#include <windows.h>


namespace std {

class mutex {
  CRITICAL_SECTION cs;

public:
  typedef LPCRITICAL_SECTION native_handle_type;
  native_handle_type native_handle() { return &cs; }

  mutex() { InitializeCriticalSection(&cs); }
  ~mutex() { DeleteCriticalSection(&cs); }
  mutex(const mutex &) = delete;
  mutex &operator=(const mutex &) = delete;

  void lock() { EnterCriticalSection(&cs); }
  bool try_lock() { return TryEnterCriticalSection(&cs) != 0; }
  void unlock() { LeaveCriticalSection(&cs); }
};


struct once_flag {
  long state = 0;
};

template <typename Callable, typename... Args>
void call_once(once_flag &flag, Callable &&f, Args &&...args) {
  if (InterlockedCompareExchange(&flag.state, 1, 0) == 0) {
    f(args...);
    InterlockedExchange(&flag.state, 2);
  } else {
    while (InterlockedCompareExchange(&flag.state, 2, 2) != 2) {
      Sleep(0);
    }
  }
}

} 

#endif