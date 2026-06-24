package com.doan.reviewhub.security;

import com.doan.reviewhub.entity.User;
import com.doan.reviewhub.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain chain
    ) throws ServletException, IOException {

        String path = request.getServletPath();
        String method = request.getMethod();

        // Cho phép preflight CORS đi qua, tránh lỗi OPTIONS 403 từ Cloudflare Pages
        if ("OPTIONS".equalsIgnoreCase(method)) {
            chain.doFilter(request, response);
            return;
        }

        /*
         * KHÔNG bỏ qua /api/auth/me.
         * /api/auth/me cần JwtAuthFilter đọc Authorization: Bearer <token>
         * để set AuthenticationPrincipal User cho AuthController.me().
         */
        boolean publicAuthRoute =
                path.equals("/api/auth/login") ||
                path.equals("/api/auth/register") ||
                path.equals("/api/auth/forgot-password") ||
                path.equals("/api/auth/reset-password");

        if (
                publicAuthRoute ||
                path.equals("/api/health") ||
                path.equals("/") ||
                path.equals("/error") ||
                path.equals("/favicon.ico") ||
                path.startsWith("/api/operators") ||
                path.startsWith("/api/plans") ||
                path.startsWith("/api/ai/") ||
                path.startsWith("/api/v1/")
        ) {
            chain.doFilter(request, response);
            return;
        }

        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);

            if (jwtUtil.validate(token)) {
                String email = jwtUtil.getEmail(token);
                User user = userRepository.findByEmail(email).orElse(null);

                if (user != null) {
                    var auth = new UsernamePasswordAuthenticationToken(
                            user,
                            null,
                            List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().toUpperCase()))
                    );

                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            }
        }

        chain.doFilter(request, response);
    }
}